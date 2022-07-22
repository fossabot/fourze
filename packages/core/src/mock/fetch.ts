import type { FourzeResponse, FourzeRoute } from "../shared"
import { createRequest, createResponse } from "../shared"

const originalFetch = globalThis.fetch

class ProxyFetchResponse implements Response {
    url: string = ""

    body: ReadableStream<Uint8Array> | null = null

    bodyUsed: boolean = false

    statusText: string = "OK"

    status: number = 200

    ok: boolean = true

    redirected: boolean = false

    type: ResponseType = "basic"

    headers: Headers = new Headers()

    data: any

    _response: FourzeResponse

    constructor(response: FourzeResponse) {
        this.url = response.req.url!
        this.data = response.result
        for (let [key, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) {
                value = value.join(",")
            }
            this.headers.append(key, value ?? "")
        }
        this._response = response
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(0))
    }

    blob(): Promise<Blob> {
        return Promise.resolve(new Blob())
    }

    formData(): Promise<FormData> {
        return Promise.resolve(new FormData())
    }

    json(): Promise<any> {
        return Promise.resolve(typeof this.data == "string" ? JSON.parse(this.data) : this.data)
    }

    clone(): Response {
        return new ProxyFetchResponse(this._response)
    }

    text(): Promise<string> {
        return Promise.resolve(this.data)
    }
}

export function createProxyFetch(routes: FourzeRoute[] = []) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
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

        const route = routes.find(e => e.match(url, method))
        if (route) {
            const headers: Record<string, string[]> = {}
            new Headers(init?.headers ?? {}).forEach((value, key) => {
                if (headers[key]) {
                    headers[key].push(value)
                } else {
                    headers[key] = [value]
                }
            })
            const request = createRequest({ url, method, body, headers })

            const response = createResponse()

            await route.dispatch(request, response)

            return new ProxyFetchResponse(response)
        }
        return originalFetch(input, init)
    }
}
