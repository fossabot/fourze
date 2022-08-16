import { Fourze, isFourze } from "../app"
import { delayHook } from "../hooks"
import { createRouter } from "../router"
import { defineRoute, FourzeHook, FourzeRoute, isRoute } from "../shared"
import { DelayMsType } from "../utils"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

interface MockOptions {
    base?: string
    routes?: FourzeRoute[] | Fourze[]
    hooks?: FourzeHook[]
    delay?: DelayMsType
}

export function setupMock({ base, routes = [], hooks = [], delay }: MockOptions) {
    const _routes: FourzeRoute[] = []
    for (let route of routes) {
        if (isFourze(route)) {
            _routes.push(...route.routes)
            hooks.push(...route.hooks)
        } else if (isRoute(route)) {
            _routes.push(route)
        }
    }

    if (delay) {
        hooks.push(delayHook(delay))
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
