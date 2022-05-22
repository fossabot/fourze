import type { ServerResponse } from "http"
import qs from "query-string"
import logger from "./log"
import { normalizeUrl } from "./util"

export interface FouzeServerContext {
    request: FourzeRequest
    response: FourzeResponse
}

export interface FourzeRequest {
    url: string
    method?: string
    route: FourzeRoute
    relativePath: string
    query: Record<string, any>
    params: Record<string, any>
    body: Record<string, any>
    /**
     *  {...query, ...params, ...body}
     */
    data: Record<string, any>
    headers: Record<string, string | string[] | undefined>
}

export interface FourzeResponse extends ServerResponse {
    json(data: any): void
    image(data: any): void
    text(data: string): void
    binary(data: any): void
    redirect(url: string): void
    localData: any
}

export const FourzeRouteSymbol = Symbol("FourzeRoute")

export interface FourzeBaseRoute {
    path: string
    method?: RequestMethod
    handle: FourzeHandle
}

export interface FourzeRoute extends FourzeBaseRoute {
    [FourzeRouteSymbol]: true
}

export interface FourzeMiddlewareOptions {
    routes: FourzeRoute[]
}

export type FourzeHandle = (request: FourzeRequest, response: FourzeResponse) => any | Promise<any>

export type Fourze = {
    [K in RequestMethod]: (path: string, handle: FourzeHandle) => Fourze
} & {
    (path: string, method: RequestMethod | undefined, handle: FourzeHandle): Fourze
    (path: string, handle: FourzeHandle): Fourze
    request(path: string, handle: FourzeHandle): Fourze
    request(path: string, method: RequestMethod | undefined, handle: FourzeHandle): Fourze

    readonly routes: FourzeRoute[]
}

export type FourzeSetup = (fourze: Fourze) => void | FourzeBaseRoute[]

export const FOURZE_NOT_MATCH = Symbol("FOURZE_NOT_MATCH")

export const FOURZE_METHODS: RequestMethod[] = ["get", "post", "delete", "put", "patch", "options", "head", "trace", "connect"]

export type RequestMethod = "get" | "post" | "delete" | "put" | "patch" | "head" | "options" | "trace" | "connect"

function parseQuery(url: string) {
    return qs.parseUrl(url, {
        parseNumbers: true,
        parseBooleans: true
    })
}

export interface FourzeOptions {
    base?: string
    setup: FourzeSetup
}

export type FourzeRenderTemplate = (content: any) => any

/**
 * @type import("fs")
 * @param dir
 * @param tempFn
 * @param extensions
 * @returns
 */
export function render(dir: string, tempFn?: FourzeRenderTemplate, extensions = ["html", "htm"]): FourzeHandle {
    const fs = require("fs") as typeof import("fs")
    const template = tempFn ?? (content => content)
    return async (request, response) => {
        let p: string = dir.concat("/", request.relativePath)
        const maybes = [p].concat(extensions.map(ext => normalizeUrl(`${p}/index.${ext}`)))

        while (!fs.existsSync(p) && maybes.length) {
            p = maybes.shift()!
        }

        if (p) {
            let content = fs.readFileSync(p, "utf-8")
            content = template(content)
            response.end(content)
            return
        }
        response.statusCode = 404
        response.end("404")
    }
}

export function isRoute(route: any): route is FourzeRoute {
    return !!route && !!route[FourzeRouteSymbol]
}

export function defineRoute(route: FourzeBaseRoute): FourzeRoute {
    return {
        ...route,
        [FourzeRouteSymbol]: true
    }
}

export function createFourze(base: string = "", routes: FourzeBaseRoute[] = []) {
    const fourze = ((path: string, param1: string | FourzeHandle, param2?: FourzeHandle) => {
        let method: RequestMethod | undefined = undefined
        let handle: FourzeHandle

        if (typeof param1 === "string") {
            method = param1 as RequestMethod
            handle = param2 as FourzeHandle
        } else {
            handle = param1 as FourzeHandle
        }

        routes.push({
            path,
            method,
            handle
        })
        return fourze
    }) as Fourze

    Object.assign(
        fourze,
        Object.fromEntries(
            FOURZE_METHODS.map(method => [
                method,
                (path: string, handle: FourzeHandle) => {
                    return fourze(path, method, handle)
                }
            ])
        )
    )

    Object.defineProperty(fourze, "request", {
        get() {
            return fourze
        }
    })

    Object.defineProperty(fourze, "routes", {
        get() {
            return routes.map(e => {
                if (isRoute(e)) {
                    return e
                }
                let path = e.path

                if (e.path.startsWith("@")) {
                    path = e.path.slice(1)
                } else {
                    path = base.concat("/").concat(e.path)
                }
                path = normalizeUrl(path)
                return defineRoute({
                    ...e,
                    path
                })
            })
        }
    })

    return fourze
}

export function defineRoutes(options: FourzeSetup | FourzeOptions | FourzeBaseRoute[]) {
    const isOption = typeof options !== "function" && !Array.isArray(options)
    const base = isOption ? options.base ?? "" : ""
    const setup = isOption ? options.setup : options

    const fourze = createFourze(base)

    const extra = typeof setup === "function" ? setup(fourze) : setup

    if (Array.isArray(extra)) {
        extra.forEach(e => fourze(e.path, e.method, e.handle))
    }

    return fourze.routes
}

export function transformRoute(route: FourzeRoute) {
    let { handle, method, path = "" } = route

    const PARAM_KEY_REGEX = /(\:[\w_-]+)|(\{[\w_-]+\})/g

    const regex = new RegExp(`^${path.toLowerCase().replace(PARAM_KEY_REGEX, "([a-zA-Z0-9_-\\s]+)?")}`.concat("(.*)([?&#].*)?$"))

    const pathParams = path.match(PARAM_KEY_REGEX) || []
    return {
        regex,
        method,
        match(request: FourzeRequest, response: FourzeResponse) {
            if (!method || request.method?.toLowerCase() === method.toLowerCase()) {
                let { url } = request

                const matches = url.match(regex)

                logger.info(url)

                if (matches) {
                    const params: Record<string, any> = {}
                    for (let i = 0; i < pathParams.length; i++) {
                        const key = pathParams[i].replace(/^[\:\{]/g, "").replace(/\}$/g, "")
                        const value = matches[i + 1]
                        params[key] = value
                    }
                    request.route = route
                    request.query = parseQuery(url)

                    if (matches.length > pathParams.length) {
                        request.relativePath = matches[matches.length - 2]
                    } else {
                        request.relativePath = url
                    }
                    request.params = params
                    request.data = {
                        ...request.body,
                        ...request.query,
                        ...request.params
                    }

                    return handle(request, response) ?? response.localData
                }
            }
            return FOURZE_NOT_MATCH
        }
    }
}
