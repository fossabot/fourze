import { parseUrl } from "query-string"
import { defineFourze, FourzeSetup, isFourze } from "./app"
import { Logger } from "./logger"
import type { FourzeHook, FourzeInstance, FourzeMiddleware, FourzeNext, FourzeRequest, FourzeResponse, FourzeRoute, FourzeSetupContext } from "./shared"

export interface FourzeRouter extends FourzeMiddleware {
    match(url: string, method?: string): FourzeRoute | undefined
    setup(): Promise<void>
    readonly routes: FourzeRoute[]
    readonly hooks: FourzeHook[]
    readonly context: FourzeSetupContext
}

export function createRouter(params: FourzeInstance | FourzeSetup): FourzeRouter {
    const instance = typeof params === "function" ? defineFourze(params) : params
    const logger = new Logger("@fourze/core")
    let _context: FourzeSetupContext

    const router = (async (request: FourzeRequest, response: FourzeResponse, next?: FourzeNext) => {
        await router.setup()
        for (const route of instance.routes) {
            if (!route.method || !request.method || request.method.toLowerCase() === route.method.toLowerCase()) {
                const { url } = request

                const matches = url.match(route.pathRegex)

                if (matches) {
                    const params: Record<string, any> = {}
                    for (let i = 0; i < route.pathParams.length; i++) {
                        const key = route.pathParams[i].replace(/^[\:\{]/g, "").replace(/\}$/g, "")
                        const value = matches[i + 1]
                        params[key] = value
                    }
                    request.route = route
                    request.query = parseUrl(url, {
                        parseNumbers: true,
                        parseBooleans: true
                    }).query

                    if (matches.length > route.pathParams.length) {
                        request.relativePath = matches[matches.length - 2]
                    }
                    request.params = params
                    request.data = {
                        ...request.body,
                        ...request.query,
                        ...request.params
                    }

                    request.meta = route.meta ?? {}

                    const hooks = instance.hooks.filter(e => !e.base || route.path.startsWith(e.base))

                    const handle = async function () {
                        const hook = hooks.shift()
                        if (hook) {
                            return (await hook.handle(request, response, handle)) ?? response.result
                        }
                        response.result = (await route.handle(request, response)) ?? response.result
                        return response.result
                    }

                    response.result = await handle()
                    response.matched = true
                    break
                }
            }
        }

        if (response.matched) {
            logger.info("request match", request.method, request.url)
            if (!response.writableEnded) {
                if (!!response.result && !response.hasHeader("Content-Type")) {
                    response.json(response.result)
                }
                response.end(response.result)
            }
        } else {
            await next?.()
        }
    }) as FourzeRouter

    router.match = function (url: string, method?: string): FourzeRoute | undefined {
        return instance.routes.find(e => e.match(url, method))
    }

    router.setup = async function () {
        if (isFourze(instance)) {
            await instance.setup()
        }
    }

    Object.defineProperties(router, {
        routes: {
            get() {
                return instance.routes
            }
        },
        hooks: {
            get() {
                return instance.hooks
            }
        },
        context: {
            get() {
                return _context
            }
        }
    })

    return router
}
