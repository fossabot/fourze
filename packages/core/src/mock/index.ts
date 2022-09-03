import { Fourze } from "../app"
import { createRouter } from "../router"
import type { DelayMsType } from "../utils"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

interface MockOptions {
    base?: string
    modules?: Fourze[]
    delay?: DelayMsType
}

export async function setupMock({ base, modules = [] }: MockOptions) {
    const instance = createRouter(async (fourze, context) => {
        const allModules = await Promise.all(
            modules.map(m => {
                m.setup(context)
                return m
            })
        )
        const routes = allModules.map(m => m.routes).flat()
        const hooks = allModules.map(m => m.hooks).flat()

        return {
            base,
            routes,
            hooks
        }
    })

    globalThis.XMLHttpRequest = createProxyXHR(instance)
    globalThis.fetch = createProxyFetch(instance)
}
