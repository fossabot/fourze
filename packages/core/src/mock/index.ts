import { Fourze, isFourze } from "../app"
import { FourzeRoute, isRoute } from "../shared"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

interface MockOptions {
    routes?: FourzeRoute[] | Fourze[]
}

export function setupMock({ routes = [] }: MockOptions) {
    const _routes = routes
        .map(e => (isFourze(e) ? e.routes : e))
        .flat()
        .filter(isRoute)
    globalThis.XMLHttpRequest = createProxyXHR(_routes)
    globalThis.fetch = createProxyFetch(_routes)
}
