import type { FourzeRoute } from "../shared"
import { defineRoute } from "../shared"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

interface MockOptions {
    base: string
    routes?: FourzeRoute[]
}

export function setupMock({ routes = [], base }: MockOptions) {
    routes = routes.map(e => {
        return defineRoute({
            ...e,
            base
        })
    })

    globalThis.XMLHttpRequest = createProxyXHR(routes)
    globalThis.fetch = createProxyFetch(routes)
}
