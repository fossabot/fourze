import type { ServerResponse } from "http"
import { parseUrl } from "query-string"
import logger from "./log"
import normalizePath from "normalize-path"

const FOURZE_ROUTE_SYMBOL = Symbol("FourzeRoute")
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
    json(data?: any): void
    image(data?: any): void
    text(data?: string): void
    binary(data?: any): void
    redirect(url: string): void
    result: any
    headers: Record<string, string | string[] | undefined>
    matched?: boolean
}

export interface FourzeBaseRoute {
    path: string
    base?: string
    method?: RequestMethod
    handle: FourzeHandle
}

export interface FourzeRoute extends FourzeBaseRoute {
    [FOURZE_ROUTE_SYMBOL]: true
    pathRegex: RegExp
    pathParams: RegExpMatchArray
    dispatch: FourzeDispatch
    match: (url: string, method?: string) => boolean
}

export interface FourzeMiddlewareOptions {
    routes: FourzeRoute[]
}

export type FourzeHandle = (request: FourzeRequest, response: FourzeResponse) => any | Promise<any>

export type FourzeDispatch = (request: FourzeRequest, response: FourzeResponse, next?: () => void | Promise<void>) => Promise<any>

export const FOURZE_METHODS: RequestMethod[] = ["get", "post", "delete", "put", "patch", "options", "head", "trace", "connect"]

export type RequestMethod = "get" | "post" | "delete" | "put" | "patch" | "head" | "options" | "trace" | "connect"

export type FourzeRenderer = FourzeDispatch & {
    template?: (content: any) => any
    dir: string
}

export type FourzeRenderTemplate = (content: any) => any

/**
 * @type import("fs")
 * @param dir
 * @param template
 * @param extensions
 * @returns
 */
export function createRenderer(dir: string, template?: FourzeRenderTemplate, extensions = ["html", "htm"]): FourzeRenderer {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")

    const renderer = async function (request: FourzeRequest, response: FourzeResponse, next?: () => void | Promise<void>) {
        let p: string | undefined = path.join(dir, "/", request.relativePath)
        const maybes = [p].concat(extensions.map(ext => normalizePath(`${p}/index.${ext}`)))

        do {
            p = maybes.shift()
        } while (!!p && !fs.existsSync(p))

        if (p) {
            p = normalizePath(p)
            let content = await fs.promises.readFile(p)
            logger.info("render file", p)
            content = template?.(content) ?? content

            response.end(content)
            return
        }

        await next?.()
    }

    renderer.template = template
    renderer.dir = dir

    return renderer
}

export function isRoute(route: any): route is FourzeRoute {
    return !!route && !!route[FOURZE_ROUTE_SYMBOL]
}

const REQUEST_PATH_REGEX = new RegExp(`^(${FOURZE_METHODS.join("|")}):.*`, "i")

const PARAM_KEY_REGEX = /(\:[\w_-]+)|(\{[\w_-]+\})/g

const NOT_NEED_BASE = /^((https?|file):)?\/\//gi

export function defineRoute(route: FourzeBaseRoute): FourzeRoute {
    let { handle, method, path, base } = route

    if (!method && REQUEST_PATH_REGEX.test(route.path)) {
        const index = route.path.indexOf(":")
        method = route.path.slice(0, index) as RequestMethod
        path = path.slice(index + 1).trim()
    }

    if (!NOT_NEED_BASE.test(path)) {
        path = (base ?? "/").concat(path)
    } else {
        base = path.match(NOT_NEED_BASE)?.[0] ?? "//"
    }

    path = path.replace(/^\/+/, "/")

    const pathRegex = new RegExp(`^${path.replace(PARAM_KEY_REGEX, "([a-zA-Z0-9_-\\s]+)?")}`.concat("(.*)([?&#].*)?$"), "i")

    const pathParams = path.match(PARAM_KEY_REGEX) || []

    async function dispatch(this: FourzeRoute, request: FourzeRequest, response: FourzeResponse, next?: () => void | Promise<void>) {
        if (!method || !request.method || request.method.toLowerCase() === method.toLowerCase()) {
            const { url } = request

            const matches = url.match(pathRegex)

            if (matches) {
                const params: Record<string, any> = {}
                for (let i = 0; i < pathParams.length; i++) {
                    const key = pathParams[i].replace(/^[\:\{]/g, "").replace(/\}$/g, "")
                    const value = matches[i + 1]
                    params[key] = value
                }
                request.route = this
                request.query = parseUrl(url, {
                    parseNumbers: true,
                    parseBooleans: true
                }).query

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

                const result = await handle(request, response)
                response.matched = true
                if (!response.writableEnded && !response.hasHeader("Content-Type")) {
                    response.json(result)
                }
                return
            }
        }
        await next?.()
    }

    function match(this: FourzeRoute, url: string, method?: string) {
        return (!route.method || !method || route.method.toLowerCase() === method.toLowerCase()) && this.pathRegex.test(url)
    }

    return {
        method,
        path,
        base,
        pathRegex,
        pathParams,
        handle,
        dispatch,
        match,
        get [FOURZE_ROUTE_SYMBOL](): true {
            return true
        }
    }
}
