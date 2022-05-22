import { OutgoingMessage, IncomingMessage } from "http"
import { FourzeMiddlewareOptions, isRoute, FourzeRequest, FourzeResponse, FouzeServerContext, FOURZE_NOT_MATCH, transformRoute } from "./shared"

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

export function createMiddleware(options: FourzeMiddlewareOptions) {
    logger.info("create middleware")

    return async function (req: IncomingMessage, res: OutgoingMessage, next?: () => void) {
        const { request, response } = await createServerContext(req, res)
        const routes = options.routes ?? []

        let dispatchers = Array.from(routes.filter(isRoute).map(e => transformRoute(e).match))

        for (let dispatch of dispatchers) {
            let result = dispatch(request, response)

            if (result == FOURZE_NOT_MATCH) {
                continue
            }
            logger.info("request match", request.method, request.url)

            result = result ?? ""
            const resolve = (body: any) => {
                if (!response.writableEnded) {
                    response.json(body)
                }
            }
            if (result instanceof Promise) {
                result.then(resolve)
            } else {
                resolve(result)
            }
            return
        }

        next?.()
    }
}
