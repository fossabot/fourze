import { Logger } from "../logger"
import { createRouter, FourzeRouter, FourzeRouterOptions } from "../router"
import { setProxyFetch } from "./fetch"
import { setProxyXHR } from "./xhr"

export type FourzeMockRequestMode = "xhr" | "fetch" | "request"
export interface FourzeMockRouterOptions extends FourzeRouterOptions {
    /**
     * @default ["xhr","fetch"]
     */
    mode?: FourzeMockRequestMode[] | false

    port?: string

    host?: string
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
