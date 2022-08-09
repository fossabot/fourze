import { Fourze, isFourze } from "../app"
import { createRouter } from "../router"
import { defineRoute, FourzeHook, FourzeRoute, isRoute } from "../shared"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

interface MockOptions {
    base?: string
    routes?: FourzeRoute[] | Fourze[]
    hooks?: FourzeHook[]
}

export function setupMock({ base, routes = [], hooks = [] }: MockOptions) {
    const _routes: FourzeRoute[] = []
    for (let route of routes) {
        if (isFourze(route)) {
            _routes.push(...route.routes)
            hooks.push(...route.hooks)
        } else if (isRoute(route)) {
            _routes.push(route)
        }
    }

    const instance = createRouter({
        routes: _routes.map(r => (r.base ? r : defineRoute({ ...r, base }))),
        hooks: hooks.map(r => {
            if (r.base) {
                return r
            }
            return {
                ...r,
                base
            }
        })
    })

    globalThis.XMLHttpRequest = createProxyXHR(instance)
    globalThis.fetch = createProxyFetch(instance)
}
