import { createLogger } from "../logger"
import { flatHeaders, getHeaderValue, PolyfillHeaders } from "../polyfill/header"
import type { FourzeRouter } from "../router"
import { FourzeResponse } from "../shared"
import { isString, isURL } from "../utils"

class ProxyFetchResponse implements Response {
    readonly url: string

    readonly statusText: string = "OK"

    readonly status: number = 200

    readonly headers: Headers

    readonly ok: boolean = true

    readonly body: ReadableStream<Uint8Array> | null = null

    readonly data: any

    bodyUsed: boolean = false

    redirected: boolean = false

    type: ResponseType = "basic"

    _response: FourzeResponse

    constructor(response: FourzeResponse) {
        this.url = response.url!
        this.status = response.statusCode
        this.statusText = response.statusMessage
        this.data = response.result
        this.headers = new PolyfillHeaders(response.getHeaders())
        this._response = response
    }

    async arrayBuffer() {
        return new Blob([this.data]).arrayBuffer()
    }

    async blob(): Promise<Blob> {
        return new Blob([this.data])
    }

    async formData() {
        const formData = new FormData()
        for (let [key, value] of Object.entries(this.data)) {
            formData.append(key, value as any)
        }
        return formData
    }

    async json() {
        return isString(this.data) ? JSON.parse(this.data) : this.data
    }

    clone(): Response {
        return new ProxyFetchResponse(this._response)
    }

    async text() {
        return String(this.data)
    }

    async raw() {
        return this.data
    }
}

export function setProxyFetch(router: FourzeRouter) {
    const logger = createLogger("@fourze/mock")
    const originalFetch = globalThis.fetch

    if (!originalFetch) {
        logger.warn("globalThis.fetch is not defined")
    }

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        let url: string
        let method: string = "GET"
        let body: any
        if (isString(input) || isURL(input)) {
            url = input.toString()
            method = init?.method ?? method
            body = init?.body ?? {}
        } else {
            url = input.url
            method = input.method ?? init?.method ?? method
            body = input.body ?? init?.body ?? {}
        }

        const headers = flatHeaders(init?.headers)
        const useMock = getHeaderValue(headers, "X-Fourze-Mock")

        async function mockRequest() {
            headers["X-Request-With"] = "Fourze Fetch Proxy"
            const { response } = await router.request({
                url,
                method,
                body,
                headers
            })
            if (response.matched) {
                logger.debug(`Found route by [${method}] ${url}`)
                return new ProxyFetchResponse(response)
            }
            logger.warn(`Not found route, fallback to original -> [${method}] ${url}`)
            return originalFetch(input, init)
        }

        if (useMock === "off") {
            logger.warn(`X-Fourze-Mock is off, fallback to original -> [${method}] ${url}`)
            return originalFetch(input, init)
        } else {
            return mockRequest()
        }
    }
    return globalThis.fetch
}
