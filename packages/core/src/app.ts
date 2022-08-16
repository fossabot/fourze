import { DefineFourzeHook, defineFourzeHook, defineRoute, FourzeBaseHook, FourzeBaseRoute, FourzeHandle, FourzeHook, FourzeRoute, FOURZE_METHODS, isFourzeHook, isRoute, RequestMethod } from "./shared"
import { overload } from "./utils"
export interface FourzeOptions {
    base?: string
    setup?: FourzeSetup
    routes?: FourzeBaseRoute[]
    hooks?: FourzeBaseHook[]
}

export type FourzeSetup = (fourze: Fourze) => void | FourzeBaseRoute[]

export type FourzeRequestFunctions = {
    [K in RequestMethod]: (path: string, handle: FourzeHandle) => Fourze
}

export interface Fourze extends FourzeRequestFunctions {
    (path: string, method: RequestMethod, handle: FourzeHandle): Fourze
    (path: string, method: RequestMethod, meta: Record<string, string>, handle: FourzeHandle): Fourze
    (path: string, handle: FourzeHandle): Fourze
    (route: FourzeBaseRoute): Fourze
    (routes: FourzeBaseRoute[]): Fourze
    (fourze: Fourze): Fourze
    use(hook: FourzeHook): Fourze
    use(hook: FourzeBaseHook): Fourze
    use(hook: DefineFourzeHook): Fourze
    use(base: string, hook: FourzeBaseHook): Fourze
    apply(fourze: Fourze): Fourze

    readonly hooks: FourzeHook[]
    readonly routes: FourzeRoute[]
}

const FOURZE_SYMBOL = Symbol("FourzeInstance")

export function defineFourze(routes: FourzeBaseRoute[]): Fourze

export function defineFourze(options: FourzeOptions): Fourze

export function defineFourze(setup: FourzeSetup): Fourze

export function defineFourze(): Fourze

export function defineFourze(options: FourzeOptions | FourzeBaseRoute[] | FourzeSetup = {}): Fourze {
    const isRoutes = Array.isArray(options)
    const isSetup = typeof options === "function"
    const isOption = !isRoutes && !isSetup

    const base = isOption ? options.base : undefined
    const setup = isOption ? options.setup : isSetup ? options : undefined
    const routes = (isOption ? options.routes : isRoutes ? options : []) ?? []
    const hooks: FourzeHook[] = []

    const fourze = function (this: Fourze, param0: string | FourzeBaseRoute | FourzeBaseRoute[] | Fourze, param1: string | FourzeHandle, param2?: FourzeHandle) {
        if (isFourze(param0)) {
            routes.push(...param0.routes)
            hooks.push(...param0.hooks)
        } else if (Array.isArray(param0)) {
            routes.push(...param0)
        } else if (typeof param0 === "object") {
            routes.push(param0)
        } else {
            routes.push(
                overload(
                    [
                        {
                            type: "string",
                            name: "path",
                            required: true
                        },
                        {
                            type: "string",
                            name: "method"
                        },
                        {
                            type: "function",
                            name: "handle",
                            required: true
                        }
                    ],
                    [param0, param1, param2]
                )
            )
        }
        return this
    } as Fourze

    fourze.use = function (...args: [string, FourzeBaseHook] | [FourzeBaseHook] | [DefineFourzeHook] | [FourzeHook]) {
        if (args.length === 1 && isFourzeHook(args[0])) {
            hooks.push(args[0])
        } else {
            const hook = defineFourzeHook(...(args as Parameters<typeof defineFourzeHook>))
            hooks.push(hook)
        }
        return this
    }

    fourze.apply = function (instance: Fourze) {
        if (isFourze(instance)) {
            routes.push(...instance.routes)
        }
        return this
    }

    Object.defineProperties(fourze, {
        routes: {
            get() {
                return routes.map(e => {
                    if (isRoute(e)) {
                        return e
                    }
                    return defineRoute({
                        base,
                        ...e
                    })
                })
            }
        },
        hooks: {
            get() {
                return hooks
            }
        },

        ...Object.fromEntries(
            FOURZE_METHODS.map(method => [
                method,
                {
                    get() {
                        return function (this: Fourze, path: string, handle: FourzeHandle) {
                            return this(path, method, handle)
                        }
                    }
                }
            ])
        ),

        [FOURZE_SYMBOL]: {
            get() {
                return true
            }
        }
    })

    const extra = setup?.(fourze) ?? []

    if (Array.isArray(extra) && extra.length > 0) {
        routes.push(...extra)
    }

    return fourze
}

export function isFourze(fourze: any): fourze is Fourze {
    return !!fourze && fourze[FOURZE_SYMBOL]
}
