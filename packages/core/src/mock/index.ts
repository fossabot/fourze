import { Logger } from "../logger"
import { createRouter, FourzeRouter, FourzeRouterOptions } from "../router"
import { setProxyFetch } from "./fetch"
import { setProxyXHR } from "./xhr"

export interface FourzeMockRouterOptions extends FourzeRouterOptions {
    /**
     *
     */
    mode?: ("xhr" | "fetch")[] | false
}

export interface FourzeMockRouter extends FourzeRouter {}

export function createMockRouter(options: FourzeMockRouterOptions = {}): FourzeMockRouter {
    const logger = new Logger("@fourze/mock")

    const instance = createRouter(options) as FourzeMockRouter

    logger.info("Fourze Mock is starting...")

    const mode = options.mode ?? ["xhr", "fetch"]

    if (mode) {
        if (mode.includes("fetch")) {
            setProxyFetch(instance)
        }
        if (mode.includes("xhr")) {
            setProxyXHR(instance)
        }
    }
    return instance
}
