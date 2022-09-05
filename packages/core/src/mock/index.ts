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
    const logger = new Logger("@fourze/mock")

    const instance = createRouter(async () => {
        const allModules = await Promise.all(
            modules.map(async m => {
                await m.setup()
                return m
            })
        )

        logger.info("Fourze Mock is setuped in", base)

        const routes = allModules.flatMap(m => m.routes)
        const hooks = allModules.flatMap(m => m.hooks)

        return {
            base,
            routes,
            hooks
        }
    })

    logger.info("Fourze Mock is starting...")

    globalThis.XMLHttpRequest = createProxyXHR(instance)
    globalThis.fetch = createProxyFetch(instance)
}
