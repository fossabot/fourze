import { createRequest, createResponse } from "../middleware"
import type { FourzeRoute } from "../shared"

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

    constructor(url: string, data: any) {
        this.url = url
        this.data = data
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
        return new ProxyFetchResponse(this.url, this.data)
    }

    text(): Promise<string> {
        return Promise.resolve(this.data)
    }
}

export function createProxyFetch(routes: FourzeRoute[] = []) {
    return async (input: RequestInfo, init?: RequestInit) => {
        let url: string
        let method: string = "GET"
        let body: any
        if (typeof input === "string") {
            url = input
            method = init?.method ?? method
            body = init?.body ?? {}
        } else {
            url = input.url
            method = input.method ?? init?.method ?? method
            body = input.body ?? init?.body ?? {}
        }

        const route = routes.find(e => e.match(url, method))
        if (route) {
            const request = createRequest({ url, method, body })

            const response = createResponse()

            await route.dispatch(request, response)

            return Promise.resolve(new ProxyFetchResponse(url, response.result))
        }
        return originalFetch(input, init)
    }
}
