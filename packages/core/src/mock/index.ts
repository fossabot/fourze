import { Logger } from "../logger"
import { createRouter, FourzeRouterOptions } from "../router"
import { createProxyFetch } from "./fetch"
import { createProxyXHR } from "./xhr"

export async function setupMock(options: FourzeRouterOptions) {
    const logger = new Logger("@fourze/mock")

    const instance = createRouter(options)

    logger.info("Fourze Mock is starting...")

    globalThis.XMLHttpRequest = createProxyXHR(instance)
    globalThis.fetch = createProxyFetch(instance)
}
