import { createRequest } from "../middleware"
import { FourzeResponse, FourzeRoute } from "../shared"

const originalFetch = globalThis.fetch

export function createProxyFetch(routes: FourzeRoute[] = []) {
    const proxyFetch = (input: RequestInfo, init?: RequestInit) => {
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

        const route = routes.find(e => (!e.method || e.method == method) && e.pathRegex.test(url))
        if (route) {
            const result = route.dispatch(createRequest({ url, method, body }), {} as FourzeResponse)

            function createFetchResponse(): Response {
                return {
                    ok: true,
                    status: 200,
                    statusText: "OK",
                    type: "default",
                    body: result,
                    bodyUsed: false,
                    arrayBuffer() {
                        return Promise.resolve(new ArrayBuffer(JSON.parse(result)))
                    },
                    blob() {
                        return Promise.resolve(new Blob([JSON.parse(result)], { type: "application/json" }))
                    },
                    formData() {
                        return Promise.resolve(new FormData())
                    },

                    url,
                    redirected: false,
                    headers: new Headers(),
                    clone() {
                        return createFetchResponse()
                    },
                    json() {
                        return Promise.resolve(result)
                    },
                    text() {
                        return Promise.resolve(JSON.stringify(result))
                    }
                }
            }

            return Promise.resolve(createFetchResponse())
        }
        return originalFetch(input, init)
    }

    return proxyFetch
}
