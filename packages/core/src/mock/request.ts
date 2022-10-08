import http, { ClientRequest, IncomingMessage, RequestOptions } from "http"
import https from "https"
import { Writable } from "stream"
import { URL } from "url"
import { FourzeRouter } from "../router"

type RequestCallback = (res: IncomingMessage) => void

class ProxyClientRequest extends Writable {
    _options: RequestOptions

    aborted: boolean = false

    constructor(options: RequestOptions, callback?: RequestCallback) {
        super()
        this._options = options
        if (callback) {
            this.on("response", callback)
        }
    }
}

export function setProxyNodeRequest(router: FourzeRouter) {
    const originHttpRequest = http.request
    const originHttpsRequest = https.request

    http.request = function (param0: URL | string | RequestOptions, param1?: RequestOptions | RequestCallback, param2?: RequestCallback) {
        const isString = typeof param0 == "string"
        const isUrl = param0 instanceof URL

        const isOptions = !isString && !isUrl

        const isFunction = typeof param1 == "function"

        let url: string
        if (isString) {
            url = param0
        } else if (isUrl) {
            url = param0.toString()
        } else {
            url = `${param0.protocol}//${param0.hostname}${param0.path}`
        }

        const options = (isOptions ? param0 : isFunction ? undefined : param1) ?? {}

        const callback = isFunction ? param1 : param2!

        return new ProxyClientRequest(options, callback) as unknown as ClientRequest
    }

    https.request = http.request
}
