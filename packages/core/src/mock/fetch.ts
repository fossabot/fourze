import { createLogger } from "../logger"
import type { FourzeRouter } from "../router"
import { createRequestContext, flatHeaders, FourzeRequest, FourzeResponse } from "../shared"
export class PolyfillHeaders {
    #headers: Record<string, string> = {}
    constructor(init?: HeadersInit) {
        if (Array.isArray(init)) {
            for (const [key, value] of init) {
                this.append(key, value)
            }
        } else if (init instanceof Headers) {
            init.forEach((value, key) => {
                this.append(key, value)
            })
        } else if (init) {
            for (const key in init) {
                this.#headers[key] = init[key]
            }
        }
    }

    append(name: string, value: string): void {
        this.#headers[name] = value
    }

    delete(name: string): void {
        delete this.#headers[name]
    }

    get(name: string): string | null {
        return this.#headers[name] ?? null
    }

    has(name: string): boolean {
        return name in this.#headers
    }

    set(name: string, value: string): void {
        this.#headers[name] = value
    }

    forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
        for (const key in this.#headers) {
            callbackfn(this.#headers[key], key, this)
        }
    }

    [Symbol.iterator](): IterableIterator<[string, string]> {
        return Object.entries(this.#headers)[Symbol.iterator]()
    }

    entries(): IterableIterator<[string, string]> {
        return Object.entries(this.#headers)[Symbol.iterator]()
    }

    keys(): IterableIterator<string> {
        return Object.keys(this.#headers)[Symbol.iterator]()
    }

    values(): IterableIterator<string> {
        return Object.values(this.#headers)[Symbol.iterator]()
    }
}

class ProxyFetchResponse implements Response {
    url: string = ""

    body: ReadableStream<Uint8Array> | null = null

    bodyUsed: boolean = false

    statusText: string = "OK"

    status: number = 200

    ok: boolean = true

    redirected: boolean = false

    type: ResponseType = "basic"

    headers: Headers = new PolyfillHeaders()

    data: any

    _response: FourzeResponse
    _request: FourzeRequest

    constructor(request: FourzeRequest, response: FourzeResponse) {
        this.url = request.url!
        this.data = response.result

        const _headers = Object.entries(flatHeaders(response.getHeaders()))

        for (let [key, value] of _headers) {
            if (Array.isArray(value)) {
                value = value.join(",")
            }
            this.headers.append(key, value ?? "")
        }
        this._response = response
        this._request = request
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
        return typeof this.data == "string" ? JSON.parse(this.data) : this.data
    }

    clone(): Response {
        return new ProxyFetchResponse(this._request, this._response)
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

    if (!globalThis.Headers) {
        globalThis.Headers = PolyfillHeaders
    }

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        await router.setup()
        let url: string
        let method: string = "GET"
        let body: any
        if (typeof input === "string" || input instanceof URL) {
            url = input.toString()
            method = init?.method ?? method
            body = init?.body ?? {}
        } else {
            url = input.url
            method = input.method ?? init?.method ?? method
            body = input.body ?? init?.body ?? {}
        }

        const route = router.match(url, method)

        if (route) {
            logger.debug(`Found route by [${route.method ?? "GET"}] ${route.path}`)
            const headers: Record<string, string> = {}
            new PolyfillHeaders(init?.headers ?? {}).forEach((value, key) => {
                if (headers[key]) {
                    headers[key] += `,${value}`
                } else {
                    headers[key] = value
                }
            })

            if (headers["Use-Mock"] !== "off") {
                headers["X-Request-With"] = "Fourze Fetch Proxy"
                const { request, response } = createRequestContext({
                    url,
                    method,
                    body,
                    headers
                })
                await router(request, response)
                return new ProxyFetchResponse(request, response)
            }
        }
        logger.warn(`Not found route, fallback to original -> [${method ?? "GET"}] ${url}`)
        return originalFetch(input, init)
    }
    return globalThis.fetch
}
