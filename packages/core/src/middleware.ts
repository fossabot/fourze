import { OutgoingMessage, IncomingMessage } from "http"
import { FourzeMiddlewareOptions, isRoute, FourzeRequest, FourzeResponse, FouzeServerContext } from "./shared"

import logger from "./log"

export type RequestPath = `${"get" | "post" | "delete"}:${string}` | string

export type DispatchFunction = (request: FourzeRequest) => any

export function createResponse(res: OutgoingMessage) {
    const response = res as FourzeResponse

    response.json = function (data: any) {
        this.localData = data
        this.setHeader("Content-Type", "application/json")
        this.end(JSON.stringify(data))
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

function createServerContext(req: IncomingMessage, res: OutgoingMessage): Promise<FouzeServerContext> {
    return new Promise((resolve, reject) => {
        let body = ""
        req.on("data", chunk => {
            body += chunk
        })
        req.on("end", () => {
            const request = {
                url: req.url!,
                method: req.method,
                body: body ? JSON.parse(body) : {},
                query: {},
                params: {},
                data: {},
                headers: req.headers
            } as FourzeRequest
            resolve({ request, response: createResponse(res) })
        })

        req.on("error", () => {
            reject(new Error("request error"))
        })
    })
}

export function createMiddleware(options: FourzeMiddlewareOptions = { routes: [] }) {
    logger.info("create middleware")

    const dispatchers = Array.from(options.routes.filter(isRoute)).map(e => e.dispatch)

    return async function (req: IncomingMessage, res: OutgoingMessage, next?: () => void) {
        const { request, response } = await createServerContext(req, res)

        let index = 0

        const resolve = (body: any) => {
            if (!response.writableEnded) {
                response.json(body)
            }
        }

        const fn = () => {
            const dispatch = dispatchers[index++]
            if (!!dispatch) {
                const result = dispatch(request, response, fn) ?? response.localData
                if (result) {
                    logger.info("request match", request.method, request.url)

                    if (result instanceof Promise) {
                        result.then(resolve)
                    } else {
                        resolve(result)
                    }
                    return
                }
            } else {
                next?.()
            }
        }

        fn()
    }
}
