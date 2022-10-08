import { MaybeAsyncFunction, MaybePromise, MaybeRegex } from "maybe-types"
import { parseUrl } from "query-string"
import { defineFourze, Fourze, FourzeSetup, isFourze } from "./app"
import { delayHook } from "./hooks"
import { Logger } from "./logger"
import { defineRoute, FourzeHook, FourzeInstance, FourzeMiddleware, FourzeNext, FourzeRequest, FourzeResponse, FourzeRoute, FourzeSetupContext } from "./shared"
import { asyncLock, DelayMsType, isMatch, unique } from "./utils"

export interface FourzeRouter extends FourzeMiddleware {
    /**
     * 根据url匹配路由
     * @param url
     * @param method
     */
    match(url: string, method?: string): FourzeRoute | undefined

    /**
     *  是否允许,但不一定匹配
     * @param url
     */
    isAllow(url: string): boolean

    release(): void
    setup(): MaybePromise<void>
    use(module: FourzeInstance): this
    use(setup: FourzeSetup): this
    use(path: string, setup: FourzeSetup): this

    readonly routes: FourzeRoute[]
    readonly hooks: FourzeHook[]
    readonly context: FourzeSetupContext

    readonly options: Required<FourzeRouterOptions>
}

export interface FourzeRouterOptions {
    /**
     * @example localhost
     */
    host?: string
    port?: string

    base?: string
    modules?: FourzeInstance[]
    delay?: DelayMsType

    allow?: MaybeRegex[]

    deny?: MaybeRegex[]
}

export function createRouter(): FourzeRouter

export function createRouter(options: FourzeRouterOptions): FourzeRouter

export function createRouter(modules: Fourze[]): FourzeRouter

export function createRouter(setup: MaybeAsyncFunction<Fourze[] | FourzeRouterOptions>): FourzeRouter

export function createRouter(params: FourzeRouterOptions | Fourze[] | MaybeAsyncFunction<FourzeInstance[] | FourzeRouterOptions> = {}): FourzeRouter {
    const isFunction = typeof params === "function"
    const isArray = Array.isArray(params)
    const isOptions = !isFunction && !isArray
    const setup: MaybeAsyncFunction<FourzeInstance[] | FourzeRouterOptions> = isFunction ? params : () => params
    const modules = new Set<FourzeInstance>()

    let options = isOptions ? params : {}

    const routes = new Set<FourzeRoute>()

    const hooks = new Set<FourzeHook>()

    const logger = new Logger("@fourze/core")

    let _context: FourzeSetupContext

    const router = async function (request: FourzeRequest, response: FourzeResponse, next?: FourzeNext) {
        const { url } = request

        if (router.isAllow(url)) {
            await router.setup()
            for (const route of router.routes) {
                const matches = route.match(url, request.method, options.base)
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

                    const activeHooks = router.hooks.filter(e => !e.base || route.finalPath.startsWith(e.base))

                    const handle = async function () {
                        const hook = activeHooks.shift()
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
    } as FourzeRouter

    router.isAllow = function (url: string) {
        const { allow, deny, base = "" } = options
        let rs = url.startsWith(base)
        if (allow?.length) {
            rs = isMatch(url, ...allow)
        }
        if (deny?.length) {
            rs &&= !isMatch(url, ...deny)
        }
        return rs
    }

    router.match = function (this: FourzeRouter, url: string, method?: string): FourzeRoute | undefined {
        if (this.isAllow(url)) {
            return this.routes.find(e => e.match(url, method, options.base))
        }
    }

    router.use = function (module: FourzeInstance | FourzeSetup | string, setup?: FourzeSetup) {
        if (typeof module === "string") {
            if (!setup) {
                return this
            }
            module = defineFourze(module, setup)
        } else if (typeof module === "function") {
            module = defineFourze(module)
        }

        modules.add(module)
        this.release()

        return this
    }

    const setupRouter = asyncLock(async function () {
        const rs = await setup()
        const isArray = Array.isArray(rs)

        if (!isArray) {
            options.base = rs.base ?? options.base
            options.allow = rs.allow ?? options.allow
            options.delay = rs.delay ?? options.delay
            options.modules = rs.modules ?? options.modules
            options.deny = rs.deny ?? options.deny
        } else {
            options.modules = rs
        }

        const newModules = unique([...(options.modules ?? []), ...modules])

        const newRoutes: FourzeRoute[] = []
        const newHooks: FourzeHook[] = []

        await Promise.all(
            newModules.map(async e => {
                if (isFourze(e)) {
                    await e.setup()
                }
                newRoutes.push(...e.routes)
                newHooks.push(...e.hooks)
            })
        )
        routes.clear()
        hooks.clear()

        if (options.delay) {
            hooks.add(delayHook(options.delay))
        }

        for (const route of newRoutes) {
            routes.add(
                defineRoute({
                    ...route,
                    base: route.base ?? options.base
                })
            )
        }
        for (const hook of newHooks) {
            hooks.add(hook)
        }
    })

    Object.defineProperties(router, {
        setup: {
            get() {
                return setupRouter
            }
        },
        options: {
            get() {
                const opt = {} as Required<FourzeRouterOptions>
                opt.base = options.base ?? ""
                opt.delay = options.delay ?? 0
                opt.allow = options.allow ?? []
                if (opt.base) {
                    opt.allow = unique([...(options.allow ?? []), opt.base])
                }
                opt.deny = options.deny ?? []
                opt.modules = options.modules ?? []
                return opt
            }
        },

        release: {
            get() {
                return setupRouter.release
            }
        },
        routes: {
            get() {
                return Array.from(routes)
            }
        },
        hooks: {
            get() {
                return Array.from(hooks)
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
