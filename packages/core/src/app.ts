import { MaybePromise } from "maybe-types"
import {
    DefineFourzeHook,
    defineFourzeHook,
    defineRoute,
    FourzeBaseHook,
    FourzeBaseRoute,
    FourzeHandle,
    FourzeHook,
    FourzeInstance,
    FourzeObjectProps,
    FourzeRequestData,
    FOURZE_METHODS,
    isFourzeHook,
    RequestMethod
} from "./shared"
import { asyncLock, isFunction, isString, overload, resolvePath } from "./utils"
export interface FourzeOptions {
    base?: string
    setup?: FourzeSetup
    routes?: FourzeBaseRoute[]
    hooks?: FourzeBaseHook[]
}

export type FourzeSetup = (fourze: Fourze) => MaybePromise<void | FourzeBaseRoute[] | FourzeInstance>

export type FourzeRequestFunctions = {
    [K in RequestMethod]: {
        <D>(path: string, props: FourzeObjectProps<D>, handle: FourzeHandle<D>): Fourze
        (path: string, handle: FourzeHandle): Fourze
    }
}

const FOURZE_SYMBOL = Symbol("FourzeInstance")
export interface Fourze extends FourzeRequestFunctions, FourzeInstance {
    <M extends RequestMethod, D>(path: string, method: M, data: FourzeObjectProps<D>, handle: FourzeHandle<D>): this
    <M extends RequestMethod, D>(path: string, method: M, handle: FourzeHandle<D>): this
    <D>(path: string, data: FourzeObjectProps<D>, handle: FourzeHandle<D>): this
    <D>(route: FourzeBaseRoute<D>): this
    <D>(path: string, handle: FourzeHandle<D>): this

    (routes: FourzeBaseRoute<any>[]): this

    hook(hook: FourzeHook): this
    hook(hook: FourzeBaseHook): this
    hook(hook: DefineFourzeHook): this
    hook(base: string, hook: FourzeBaseHook): this
    apply(fourze: FourzeInstance): this

    setup(): Promise<void>
    readonly [FOURZE_SYMBOL]: true
}

export function defineFourze(routes: FourzeBaseRoute[]): Fourze

export function defineFourze(options: FourzeOptions): Fourze

export function defineFourze(setup: FourzeSetup): Fourze

export function defineFourze(base: string, setup: FourzeSetup): Fourze

export function defineFourze(): Fourze

export function defineFourze(options: FourzeOptions | FourzeBaseRoute[] | FourzeSetup | string = {}, setupFn?: FourzeSetup): Fourze {
    const isBase = isString(options)
    const isRoutes = Array.isArray(options)
    const isSetup = isFunction(options)
    const isOption = !isRoutes && !isSetup && !isBase

    let _base = isBase ? options : isOption ? options.base : undefined
    const setup = isBase ? setupFn : isOption ? options.setup : isSetup ? options : undefined
    const routes = Array.from((isOption ? options.routes : isRoutes ? options : []) ?? [])
    const hooks: FourzeHook[] = []

    const fourze = function (this: Fourze, param0: string | FourzeBaseRoute | FourzeBaseRoute[], ...args: any[]) {
        if (isFourze(param0)) {
            routes.push(...param0.routes.map(defineRoute))
            hooks.push(...param0.hooks)
        } else if (Array.isArray(param0)) {
            routes.push(...param0.map(defineRoute))
        } else if (typeof param0 === "object") {
            routes.push(param0)
        } else {
            console.log(...args)
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
                            type: "object",
                            name: "data"
                        },
                        {
                            type: "function",
                            name: "handle",
                            required: true
                        }
                    ],
                    [param0, ...args]
                )
            )
        }
        return this
    } as Fourze

    fourze.hook = function (...args: [string, FourzeBaseHook] | [FourzeBaseHook] | [DefineFourzeHook] | [FourzeHook]) {
        if (args.length === 1 && isFourzeHook(args[0])) {
            hooks.push(args[0])
        } else {
            const hook = defineFourzeHook(...(args as Parameters<typeof defineFourzeHook>))
            hooks.push(hook)
        }
        return this
    }

    fourze.apply = function (instance: FourzeInstance) {
        routes.push(...instance.routes)
        hooks.push(...instance.hooks)
        return this
    }

    Object.defineProperties(fourze, {
        routes: {
            get() {
                return routes.map(e => {
                    return defineRoute({
                        ...e,
                        base: _base
                    })
                })
            }
        },
        hooks: {
            get() {
                return hooks.map(e => {
                    return {
                        ...e,
                        path: resolvePath(e.path, _base)
                    }
                })
            }
        },
        base: {
            get() {
                return _base
            },
            set(value) {
                _base = value
            }
        },

        ...Object.fromEntries(
            FOURZE_METHODS.map(method => [
                method,
                {
                    get() {
                        return function (this: Fourze, path: string, data: FourzeObjectProps, handle: FourzeHandle) {
                            return this(path, method, data, handle)
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

    fourze.setup = asyncLock(async () => {
        const extra = (await setup?.(fourze)) ?? []

        if (Array.isArray(extra)) {
            routes.push(...extra)
        } else if (extra) {
            fourze.apply(extra)
        }
    })

    return fourze
}

export function isFourze(fourze: any): fourze is Fourze {
    return !!fourze && fourze[FOURZE_SYMBOL]
}
