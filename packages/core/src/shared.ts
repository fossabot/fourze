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
    base?: string
    method?: RequestMethod
    handle: FourzeHandle
}

export interface FourzeRoute extends FourzeBaseRoute {
    [FourzeRouteSymbol]: true
    pathRegex: RegExp
    pathParams: RegExpMatchArray
}

export interface FourzeMiddlewareOptions {
    routes: FourzeRoute[]
}

export type FourzeHandle = (request: FourzeRequest, response: FourzeResponse, next?: () => void) => any | Promise<any>

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

export type FourzeRenderer = FourzeHandle & {
    template?: (content: string) => string
    dir: string
}

export type FourzeRenderTemplate = (content: any) => any

/**
 * @type import("fs")
 * @param dir
 * @param tempFn
 * @param extensions
 * @returns
 */
export function createRenderer(dir: string, template?: FourzeRenderTemplate, extensions = ["html", "htm"]): FourzeRenderer {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")

    const renderer = async (request: FourzeRequest, response: FourzeResponse, next?: () => void) => {
        let p: string = path.join(dir, "/", request.relativePath)
        const maybes = [p].concat(extensions.map(ext => normalizeUrl(`${p}/index.${ext}`)))

        do {
            p = maybes.shift()!
        } while (!!p && !fs.existsSync(p))

        if (p) {
            p = normalizeUrl(p)
            let content = await fs.promises.readFile(p)
            logger.info("render file", p)
            content = template ? template(content) : content

            response.end(content)
            return
        }

        next?.()
    }

    renderer.template = template
    renderer.dir = dir

    return renderer
}

export function isRoute(route: any): route is FourzeRoute {
    return !!route && !!route[FourzeRouteSymbol]
}

export function defineRoute(route: FourzeBaseRoute): FourzeRoute {
    const method = route.method

    const base = !route.path.startsWith("//") && route.base ? route.base : ""

    const path = normalizeUrl(base.concat("/").concat(route.path)).toLowerCase()

    const PARAM_KEY_REGEX = /(\:[\w_-]+)|(\{[\w_-]+\})/g

    const pathRegex = new RegExp(`^${path.replace(PARAM_KEY_REGEX, "([a-zA-Z0-9_-\\s]+)?")}`.concat("(.*)([?&#].*)?$"))

    const pathParams = path.match(PARAM_KEY_REGEX) || []

    const handle = function (this: FourzeRoute, request: FourzeRequest, response: FourzeResponse, next?: () => void) {
        if (!method || request.method?.toLowerCase() === method.toLowerCase()) {
            let { url } = request

            const matches = url.match(pathRegex)

            if (matches) {
                const params: Record<string, any> = {}
                for (let i = 0; i < pathParams.length; i++) {
                    const key = pathParams[i].replace(/^[\:\{]/g, "").replace(/\}$/g, "")
                    const value = matches[i + 1]
                    params[key] = value
                }
                request.route = this
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

                return route.handle(request, response) ?? response.localData
            }
        }
        next?.()
    }

    return {
        method,
        handle,
        path,
        base,
        pathRegex,
        pathParams,
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
                return defineRoute({
                    base,
                    ...e
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

export function matchRoute(request: FourzeRequest, response: FourzeResponse, next?: () => void) {}
