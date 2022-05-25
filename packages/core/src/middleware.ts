import { OutgoingMessage, IncomingMessage } from "http"
import { FourzeMiddlewareOptions, isRoute, FourzeRequest, FourzeResponse, FouzeServerContext } from "./shared"

import logger from "./log"

export type RequestPath = `${"get" | "post" | "delete"}:${string}` | string

export type DispatchFunction = (request: FourzeRequest) => any

export function createResponse(res?: OutgoingMessage) {
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
            this.localData = data
        }
    }

    response.json = function (data: any) {
        data = typeof data == "string" ? data : JSON.stringify(data)
        this.localData = data
        this.setHeader("Content-Type", "application/json")
        this.end(data)
    }

    response.binary = function (data: any) {
        this.localData = data
        this.setHeader("Content-Type", "application/octet-stream")
        this.end(data)
    }

    response.image = function (data: any) {
        this.localData = data
        this.setHeader("Content-Type", "image/jpeg")
        this.end(data)
    }

    response.text = function (data: string) {
        this.localData = data
        this.setHeader("Content-Type", "text/plain")
        this.end(data)
    }

    response.redirect = function (url: string) {
        this.statusCode = 302
        this.setHeader("Location", url)
        this.end()
    }

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

function createServerContext(req: IncomingMessage, res: OutgoingMessage): Promise<FouzeServerContext> {
    return new Promise((resolve, reject) => {
        let body = ""
        req.on("data", chunk => {
            body += chunk
        })
        req.on("end", () => {
            const request = createRequest({
                url: req.url!,
                method: req.method,
                body: body ? JSON.parse(body) : {},
                query: {},
                params: {},
                data: {},
                headers: req.headers
            })

            const response = createResponse(res)

            resolve({ request, response })
        })

        req.on("error", () => {
            reject(new Error("request error"))
        })
    })
}

export function createMiddleware(options: FourzeMiddlewareOptions = { routes: [] }) {
    logger.info("create middleware")

    return async function (req: IncomingMessage, res: OutgoingMessage, next?: () => void) {
        const { request, response } = await createServerContext(req, res)
        const dispatchers = options.routes.filter(isRoute).map(e => e.dispatch)

        let index = 0

        const fn = async () => {
            const dispatch = dispatchers[index++]
            if (!!dispatch) {
                const result = await dispatch(request, response, fn)
                if (result) {
                    logger.info("request match", request.method, request.url)
                    if (!response.writableEnded) {
                        response.json(result)
                    }
                }
            } else {
                next?.()
            }
        }

        await fn()
    }
}
