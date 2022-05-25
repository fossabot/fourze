import type { FSWatcher } from "chokidar"
import { FourzeBaseRoute, FourzeRoute, isRoute, logger, normalizeUrl, createRenderer, defineRoute } from "@fourze/core"
import chokidar from "chokidar"
import fs from "fs"
import { resolve, join } from "path"

export interface FourzeRouterOptions {
    base?: string
    dir?: string
    watcher?: FSWatcher
    pattern?: (string | RegExp)[]
    routes?: FourzeBaseRoute[]
    moduleNames?: string[]
}

export interface FourzeRouter {
    load(): void | Promise<void>
    load(moduleName: string): void | Promise<void>
    remove(moduleName: string): this
    watch(watcher?: FSWatcher): this
    watch(dir?: string, watcher?: FSWatcher): this
    proxy(p: string | FourzeProxyOption): this
    readonly base: string
    readonly routes: FourzeRoute[]
    readonly moduleNames: string[]
}

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

function transformPattern(pattern: (string | RegExp)[]) {
    return pattern.map(p => {
        if (typeof p === "string") {
            return new RegExp(p)
        }
        return p
    })
}

export interface FourzeProxyOption extends Omit<FourzeBaseRoute, "handle"> {
    target?: string
}

export function createRouter(options: FourzeRouterOptions): FourzeRouter {
    const base = (options.base = options.base ?? "/")
    const rootDir = resolve(process.cwd(), options.dir ?? "./routes")
    const pattern = transformPattern(options.pattern ?? [".ts", ".js"])
    const moduleNames: string[] = Array.from(options.moduleNames ?? [])

    const routes: FourzeBaseRoute[] = Array.from(options.routes ?? [])

    const router = {
        async load(moduleName: string = rootDir) {
            if (!fs.existsSync(moduleName)) {
                return
            }

            const loadModule = async (moduleName: string) => {
                logger.info("load module", moduleName)
                if (moduleName.endsWith(".ts")) {
                    await loadTsModule(moduleName)
                } else {
                    await loadJsModule(moduleName)
                }
            }

            const loadJsModule = async (moduleName: string) => {
                this.remove(moduleName)
                const mod = require(moduleName)
                const route = mod?.exports?.default ?? mod?.default
                console.log(route, mod)
                if (isRoute(route) || (Array.isArray(route) && route.some(isRoute))) {
                    moduleNames.push(moduleName)
                }
            }

            const loadTsModule = async (moduleName: string) => {
                const modName = moduleName.replace(".ts", TEMPORARY_FILE_SUFFIX)
                const { build } = require("esbuild") as typeof import("esbuild")

                await build({
                    entryPoints: [moduleName],
                    external: ["@fourze/core"],
                    outfile: modName,
                    write: true,
                    platform: "node",
                    bundle: true,
                    format: "cjs",
                    metafile: true,
                    target: "es6"
                })

                await loadJsModule(modName)

                try {
                    await fs.promises.unlink(modName)
                } catch (err) {
                    logger.error("delete file " + modName + " error", err)
                }
            }

            const stat = await fs.promises.stat(moduleName)
            if (stat.isDirectory()) {
                const files = await fs.promises.readdir(moduleName)
                const tasks = files.map(name => this.load(join(moduleName, name)))
                await Promise.all(tasks)
            } else if (stat.isFile()) {
                if (!pattern.some(e => e.test(moduleName))) {
                    return
                }
                await loadModule(moduleName)
            }
        },
        watch(dir?: string | FSWatcher, customWatcher?: FSWatcher) {
            let watchDir: string
            let watcher: FSWatcher | undefined = undefined
            if (typeof dir === "string") {
                watchDir = dir
                watcher = customWatcher ?? chokidar.watch(dir)
            } else {
                watchDir = rootDir
                watcher = dir ?? chokidar.watch(rootDir)
            }

            watcher.add(watchDir)

            watcher.on("all", async (event, path) => {
                if (!path.startsWith(watchDir) || path.endsWith(TEMPORARY_FILE_SUFFIX)) {
                    return
                }

                switch (event) {
                    case "add":
                    case "change":
                        await this.load(path)
                        break
                    case "unlink":
                        this.remove(path)
                        break
                    case "unlinkDir":
                        for (const modName of Object.keys(require.cache)) {
                            if (modName.startsWith(path)) {
                                this.remove(modName)
                            }
                        }
                        await this.load()
                        break
                }
            })
            return this
        },
        remove(moduleName: string) {
            delete require.cache[moduleName]

            for (const [i, modName] of moduleNames.entries()) {
                if (modName === moduleName) {
                    moduleNames.splice(i, 1)
                }
            }
            return this
        },
        proxy(p: string | FourzeProxyOption) {
            let path: string
            let dir: string
            let renderBase = base
            if (typeof p == "string") {
                path = p
                dir = join(rootDir, "/", path)
            } else {
                path = p.path
                dir = p.target ?? join(rootDir, "/", path)
                renderBase = p.base ?? base
            }

            routes.push({
                path,
                base: renderBase,
                handle: createRenderer(dir)
            })
            return this
        },
        get base() {
            return base
        },
        get moduleNames() {
            return moduleNames
        },
        get routes() {
            return routes
                .concat(
                    moduleNames
                        .map(modName => {
                            const mod = require.cache[modName]
                            return mod?.exports.default as FourzeRoute | FourzeRoute[]
                        })
                        .flat()
                        .filter(isRoute)
                        .map(e => {
                            return {
                                ...e,
                                base
                            }
                        })
                )
                .map(defineRoute)
                .sort((a, b) => {
                    if (b.path.startsWith(a.path)) {
                        return 1
                    }
                    return b.path.localeCompare(a.path)
                })
        }
    }
    return router
}
