import type { ServerResponse } from "http"
import qs from "query-string"
import logger from "./log"

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
    headers: Record<string, string | string[]>
}

export interface FourzeResponse extends ServerResponse {
    json(data: any): void
    image(data: any): void
    text(data: string): void
    binary(data: any): void
    redirect(url: string): void
}

export interface FourzeRoute {
    path: string
    method?: string
    handle: FourzeHandle
}

export interface FourzeMiddlewareOptions {
    routes: FourzeRoute[]
}

export type FourzeHandle = (request: FourzeRequest, response: FourzeResponse) => any | Promise<any>

export type Fourze = {
    [K in RequestMethod]: (path: string, handle: FourzeHandle) => Fourze
} & {
    (path: string, method: RequestMethod, handle: FourzeHandle): Fourze
    (path: string, handle: FourzeHandle): Fourze

    readonly routes: FourzeRoute[]
}

export type FourzeSetup = (fourze: Fourze) => void | FourzeRoute[]
export const FOURZE_NOT_MATCH = Symbol("FOURZE_NOT_MATCH")

export const FOURZE_METHODS: RequestMethod[] = ["get", "post", "delete", "put", "patch", "options", "head", "trace", "connect"]

export type RequestMethod = "get" | "post" | "delete" | "put" | "patch" | "head" | "options" | "trace" | "connect"

function parseQuery(url: string) {
    return qs.parse(url.slice(url.indexOf("?") + 1), {
        parseNumbers: true,
        parseBooleans: true
    })
}

export interface FourzeOptions {
    base?: string
    setup: FourzeSetup
}

export type FourzeRenderTemplate = (content: any) => any

export function render(dir: string, tempFn?: FourzeRenderTemplate): FourzeHandle {
    const fs = require("fs")
    const template = tempFn ?? (content => content)
    return async (request, response) => {
        let p = dir.concat("/", request.relativePath).replaceAll("\\", "/").replaceAll("//", "/")
        console.info(p)
        if (fs.existsSync(p)) {
            let stat = fs.lstatSync(p)
            if (stat.isDirectory() || p.endsWith("/")) {
                p = p.concat("/index.html")
            }
            if (fs.existsSync(p)) {
                let content = fs.readFileSync(p, "utf-8")
                content = template(content)
                response.end(content)
                return
            }
        }
        response.statusCode = 404
        response.end("404")
    }
}

export function defineRoute(options: FourzeSetup | FourzeOptions) {
    const isFn = typeof options === "function"
    const base = isFn ? "" : options.base ?? ""
    const setup = isFn ? options : options.setup

    let routes: FourzeRoute[] = []

    let extra: FourzeRoute[] | void

    if (typeof setup === "function") {
        const fourze = (url: string, param1: string | FourzeHandle, param2?: FourzeHandle) => {
            let method: string | undefined = undefined
            let handle: FourzeHandle

            if (typeof param1 === "string") {
                method = param1 as RequestMethod
                handle = param2 as FourzeHandle
            } else {
                handle = param1 as FourzeHandle
            }

            routes.push({
                path: url,
                method,
                handle
            })
            return fourze
        }

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

        Object.defineProperty(fourze, "routes", {
            get() {
                return routes
            }
        })

        extra = setup(fourze as Fourze)
    } else {
        extra = setup as FourzeRoute[]
    }

    if (Array.isArray(extra)) {
        routes.push(...extra)
    }

    routes.forEach(e => {
        let path = e.path

        if (e.path.startsWith("@")) {
            path = e.path.slice(1)
        } else {
            path = base.concat("/").concat(e.path)
        }
        path = path.replace(/\/+/g, "/")
        e.path = path
    })

    return routes
}

export function transformRoute(route: FourzeRoute) {
    let { handle, method, path = "" } = route

    const PARAM_KEY_REGEX = /(\:[\w_-]+)|(\{[\w_-]+\})/g

    const regex = new RegExp(`^${path.toLowerCase().replace(PARAM_KEY_REGEX, "([a-zA-Z0-9_-\\s]+)?")}`.concat("(.*)([?&#].*)?$"))

    logger.info(regex)

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

                    return handle(request, response)
                }
            }
            return FOURZE_NOT_MATCH
        }
    }
}
