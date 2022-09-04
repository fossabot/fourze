import { Fourze } from "../app"
import { Logger } from "../logger"
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
    const instance = createRouter(async () => {
        const allModules = await Promise.all(
            modules.map(async m => {
                await m.setup()
                return m
            })
        )

        console.log("allModules", allModules)

        const routes = allModules.map(m => m.routes).flat()
        const hooks = allModules.map(m => m.hooks).flat()

        return {
            base,
            routes,
            hooks
        }
    })

    const logger = new Logger("@fourze/mock")

    logger.info("Fourze Mock is starting...")

    globalThis.XMLHttpRequest = createProxyXHR(instance)
    globalThis.fetch = createProxyFetch(instance)
}
