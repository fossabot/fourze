import { createRequest, createResponse, logger } from "@fourze/core"
import type { FourzeRequest, FourzeResponse } from "@fourze/core"
import type { IncomingMessage, OutgoingMessage, Server } from "http"
import http from "http"
import https from "https"

export type FourzeMiddleware = (req: FourzeRequest, res: FourzeResponse, next?: () => void | Promise<void>) => Promise<void>

export interface FourzeAppOptions {
    port?: number
    server?: Server
    serverMode?: "http" | "https"
    middlewares?: FourzeMiddleware[]
}

export interface FourzeApp {
    (req: IncomingMessage, res: OutgoingMessage, next?: () => void | Promise<void>): Promise<void>
    readonly port: number
    readonly server?: Server
    readonly serverMode: "http" | "https"
    createServer(): Server
    use(middleware: FourzeMiddleware | FourzeMiddleware[]): this
    listen(port?: number): Promise<Server>
}

export interface FouzeServerContext {
    request: FourzeRequest
    response: FourzeResponse
}

export function createServerContext(req: IncomingMessage, res: OutgoingMessage): Promise<FouzeServerContext> {
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

export function createApp(options: FourzeAppOptions = {}) {
    let _port = options.port ?? 3456
    let _server = options.server

    let _serverMode = options.serverMode ?? "http"

    const middlewares = options.middlewares ?? []

    const app = async function (req: IncomingMessage, res: OutgoingMessage, next?: () => void | Promise<void>) {
        const { request, response } = await createServerContext(req, res)

        let i = 0
        const fn = async () => {
            const middleware = middlewares[i++]
            if (middleware) {
                await middleware(request, response, fn)
            } else if (next && typeof next === "function") {
                await next()
            } else if (!response.writableEnded) {
                res.end()
            }
        }

        await fn()
    } as FourzeApp

    app.use = function (middleware: FourzeMiddleware | FourzeMiddleware[]) {
        if (Array.isArray(middleware)) {
            middlewares.push(...middleware)
        } else {
            middlewares.push(middleware)
        }
        return this
    }

    app.createServer = function () {
        switch (_serverMode) {
            case "https":
                _server = https.createServer(app)
                break
            case "http":
            default:
                _server = http.createServer(app)
                break
        }
        return _server
    }

    app.listen = function (port?: number) {
        _port = port ?? _port
        _server = _server ?? this.createServer()

        return new Promise((resolve, reject) => {
            const server = this.server
            if (server) {
                if (!server.listening) {
                    server.listen(_port, () => {
                        let address = server.address()
                        address = typeof address == "string" ? address : `${address?.address}:${address?.port}` ?? `http://localhost:${_port}`
                        logger.info(`server listening on ${address}`)
                        logger.info("application started.")
                        resolve(server)
                    })
                } else {
                    reject(new Error("Server is already listening"))
                }
            } else {
                reject(new Error("Server is not defined"))
            }
        })
    }

    Object.defineProperties(app, {
        port: {
            get() {
                return _port
            }
        },
        server: {
            get() {
                return _server
            }
        },
        serverMode: {
            get() {
                return _serverMode
            }
        }
    })

    return app
}
