import type { ClientRequest, ClientRequestArgs, IncomingMessage, RequestOptions } from "http"
import http from "http"
import https from "https"
import { createLogger, FourzeLogger } from "../logger"
import type { FourzeRouter } from "../router"
import { createRequestContext, flatHeaders, FourzeResponse } from "../shared"
import { isBuffer, isFunction, isString } from "../utils"

type RequestCallback = (res: IncomingMessage) => void

type WriteCallback = (error?: Error | null) => void

interface ProxyRequestOptions extends ClientRequestArgs {
    nativeProtocols?: Record<string, typeof http | typeof https>
    nativeRequest?: typeof http.request | typeof https.request
    agents?: Record<string, http.Agent | https.Agent>
    logger?: FourzeLogger
}

function optionsToURL(options: RequestOptions): URL {
    const protocol = options.protocol ?? "http:"
    const hostname = options.hostname ?? "localhost"
    const path = options.path ?? "/"
    const url = new URL(`${protocol}//${hostname}${path}`)
    if (options.port) {
        url.port = options.port.toString()
    }
    return url
}

export function setProxyNodeRequest(router: FourzeRouter) {
    const originHttpRequest = http.request
    const originHttpsRequest = https.request
    const logger = createLogger("@fourze/mock")

    if (!originHttpRequest || !originHttpsRequest) {
        logger.warn("request is not defined")
        return
    }
    const { Readable, Writable } = require("stream")
    class ProxyClientResponse extends Readable {
        headers: IncomingMessage["headers"]
        method?: string
        statusCode: number = 200
        completed = false
        data: Buffer | Uint8Array | string
        _offset = 0
        _maxLength = 0

        constructor(res: FourzeResponse) {
            super()
            this.headers = flatHeaders(res.getHeaders())
            this.method = res.method
            this.statusCode = res.statusCode
            this.data = res.result
            this._maxLength = this.data.length
        }

        read(size: number = 1024) {
            if (this.completed) {
                return null
            }
            if (this._offset >= this._maxLength) {
                this.completed = true
                this.emit("end")
                return null
            }
            const start = this._offset
            const end = (this._offset = Math.min(this._maxLength, start + size))
            const chunk = this.data.slice(start, end)
            this.emit("data", Buffer.from(chunk))
            return chunk
        }
    }

    class ProxyClientRequest extends Writable {
        aborted: boolean = false

        _ending: boolean
        _ended: boolean
        _options: ProxyRequestOptions

        _url: string

        logger: FourzeLogger

        constructor(options: ProxyRequestOptions, callback?: RequestCallback) {
            super()
            this._ending = false
            this._ended = false
            this._options = options
            this.logger = options.logger ?? createLogger("@fourze/mock")
            this._url = optionsToURL(options).toString()

            if (callback) {
                this.on("response", callback)
            }
            this._performRequest()
        }

        async _performRequest() {
            const protocol = this._options.protocol ?? "http:"
            const method = this._options.method
            await router.setup()

            const route = router.match(this._url, method)
            if (route) {
                this.logger.debug(`Found route by [${method ?? "GET"}] ${route.path}`)
                const { request, response } = createRequestContext({
                    url: this._url,
                    method: method,
                    headers: this._options.headers
                })
                await router(request, response)
                const res = new ProxyClientResponse(response)
                this.emit("response", res)
            } else {
                this.logger.warn(`Not found route, fallback to original -> [${method ?? "GET"}] ${this._url}`)
                const nativeRequest = this._options.nativeRequest
                if (nativeRequest) {
                    const req = nativeRequest(this._options, res => {
                        this.emit("response", res)
                    })
                    req.end()
                } else {
                    throw new Error(`Unsupported protocol: ${protocol}`)
                }
            }
        }

        write(chunk: any, encoding?: BufferEncoding, callback?: WriteCallback): boolean

        write(chunk: any, callback?: (error?: Error | null) => void): boolean

        write(chunk: any, enc?: BufferEncoding | WriteCallback, cb?: WriteCallback): boolean {
            const isCallback = isFunction(enc)
            const callback = isCallback ? enc : cb
            const encoding = (isCallback ? undefined : enc) ?? "utf-8"
            if (this._ending) {
                throw new Error("write after end")
            }
            if (!isString(chunk) && !isBuffer(chunk)) {
                throw new TypeError("CHUNK should be a string, Buffer or Uint8Array")
            }
            if (chunk.length == 0) {
                if (callback) {
                    callback()
                }
                return false
            }

            return true
        }

        end(callback: WriteCallback): this

        end(chunk?: any, encoding?: BufferEncoding, callback?: WriteCallback): this

        end(chunk?: any, callback?: WriteCallback): this

        end(chunk?: any | WriteCallback, encoding?: BufferEncoding | WriteCallback, callback?: WriteCallback): this {
            if (isFunction(chunk)) {
                callback = chunk
                chunk = encoding = undefined
            } else if (isFunction(encoding)) {
                callback = encoding
                encoding = undefined
            }
            if (!chunk) {
                this._ended = this._ending = true
            } else {
                this.write(chunk, encoding, err => {
                    this._ended = true
                    callback?.(err)
                })
                this._ending = true
            }
            return this
        }

        abort() {
            this.aborted = true
        }
    }

    http.request = function (param0: URL | string | ProxyRequestOptions, param1?: ProxyRequestOptions | RequestCallback, param2?: RequestCallback) {
        const isString = typeof param0 == "string"
        const isUrl = param0 instanceof URL

        const isOptions = !isString && !isUrl

        const isFunction = typeof param1 == "function"

        const options = (isOptions ? param0 : isFunction ? undefined : param1) ?? {}

        const u = isString ? new URL(param0) : isUrl ? param0 : optionsToURL(param0)

        options.protocol = u.protocol
        options.hostname = u.hostname
        options.port = u.port
        options.path = u.pathname + u.search
        options.nativeRequest = u.protocol == "https:" ? originHttpsRequest : originHttpRequest

        const callback = isFunction ? param1 : param2!

        return new ProxyClientRequest(options, callback) as unknown as ClientRequest
    }

    https.request = http.request
}
