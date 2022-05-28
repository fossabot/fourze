import type { IncomingMessage, OutgoingMessage } from "http"
import logger from "./log"
import { FourzeMiddlewareOptions, FourzeRequest, FourzeResponse, isRoute } from "./shared"

export interface FouzeServerContext {
    request: FourzeRequest
    response: FourzeResponse
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

            const response = createResponse(res as FourzeResponse)

            resolve({ request, response })
        })

        req.on("error", () => {
            reject(new Error("request error"))
        })
    })
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

export function createMiddleware(options: FourzeMiddlewareOptions = { routes: [] }) {
    logger.info("create middleware")

    return async function (req: IncomingMessage, res: OutgoingMessage, next?: () => void | Promise<void>) {
        const { request, response } = await createServerContext(req, res)
        const dispatchers = options.routes.filter(isRoute).map(e => e.dispatch)

        const fn = async () => {
            const dispatch = dispatchers.shift()
            if (!!dispatch) {
                await dispatch(request, response, fn)
            }
        }

        await fn()

        if (response.matched) {
            logger.info("request match", request.method, request.url)
            if (!response.writableEnded) {
                response.end(response.result)
            }
        } else {
            await next?.()
        }
    }
}
