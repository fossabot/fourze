import type { ServerResponse } from "http"
import { parseUrl } from "query-string"

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

export function createResponse(res?: FourzeResponse) {
    const response = (res as FourzeResponse) ?? {
        headers: {},
        setHeader(name: string, value: string) {
            if (this.hasHeader(name)) {
                this.headers[name] += `,${value}`
            } else {
                this.headers[name] = value
            }
        },
        getHeader(name: string) {
            return this.headers[name]
        },
        getHeaderNames() {
            return Object.keys(this.headers)
        },
        hasHeader(name) {
            return !!this.headers[name]
        },
        end(data: any) {
            this.result = data
        }
    }

    response.json = function (data: any) {
        data = typeof data == "string" ? data : JSON.stringify(data)
        this.result = data
        this.setHeader("Content-Type", "application/json")
    }

    response.binary = function (data: any) {
        this.result = data
        this.setHeader("Content-Type", "application/octet-stream")
    }

    response.image = function (data: any) {
        this.result = data
        this.setHeader("Content-Type", "image/jpeg")
    }

    response.text = function (data: string) {
        this.result = data
        this.setHeader("Content-Type", "text/plain")
        this.end(data)
    }

    response.redirect = function (url: string) {
        this.statusCode = 302
        this.setHeader("Location", url)
    }

    response.setHeader("X-Powered-By", "fourze")

    return response
}

export function createRequest(options: Partial<FourzeRequest>) {
    if (typeof options.body === "string") {
        options.body = JSON.parse(options.body)
    }

    return {
        relativePath: options.url,
        query: {},
        body: {},
        params: {},
        data: {},
        headers: {},
        ...options
    } as FourzeRequest
}
