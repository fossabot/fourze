import type { FSWatcher } from "chokidar"
import { FourzeRoute, logger, normalizeUrl } from "@fourze/core"
import chokidar from "chokidar"
import fs from "fs"
import path from "path"

export interface FourzeRouterOptions {
    base?: string
    dir?: string
    watcher?: FSWatcher
    pattern?: (string | RegExp)[]
    moduleNames?: string[]
}

export interface FourzeRouter {
    load(): void | Promise<void>
    load(moduleName: string): void | Promise<void>
    remove(moduleName: string): void | Promise<void>
    watch(watcher?: FSWatcher): void
    watch(dir?: string, watcher?: FSWatcher): void
    routes: FourzeRoute[]
    moduleNames: string[]
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

export function createRouter(options: FourzeRouterOptions): FourzeRouter {
    const base = (options.base = options.base ?? "/")
    const rootDir = path.resolve(process.cwd(), options.dir ?? "./routes")
    const pattern = transformPattern(options.pattern ?? [".ts", ".js"])
    const moduleNames: string[] = options.moduleNames ?? []

    const load = async (moduleName: string = rootDir) => {
        const stat = await fs.promises.stat(moduleName)
        if (stat.isDirectory()) {
            const files = await fs.promises.readdir(moduleName)
            const tasks = files.map(name => load(path.join(moduleName, name)))
            await Promise.all(tasks)
        } else if (stat.isFile()) {
            if (!pattern.some(e => e.test(moduleName))) {
                return
            }
            await loadModule(moduleName)
        }
    }

    const loadModule = async (moduleName: string) => {
        logger.info("loadMockModule", moduleName)
        if (moduleName.endsWith(".ts")) {
            await loadTsModule(moduleName)
        } else {
            await loadJsModule(moduleName)
        }
    }

    const loadJsModule = async (moduleName: string) => {
        await remove(moduleName)
        require(moduleName)
        moduleNames.push(moduleName)
    }

    const loadTsModule = async (moduleName: string) => {
        const modName = moduleName.replace(".ts", TEMPORARY_FILE_SUFFIX)
        const { build } = require("esbuild")
        await build({
            entryPoints: [moduleName],
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
            fs.promises.unlink(modName)
        } catch (err) {
            logger.error("delete file " + modName + " error", err)
        }
    }

    const remove = async (moduleName: string) => {
        delete require.cache[moduleName]

        for (const [i, modName] of moduleNames.entries()) {
            if (modName === moduleName) {
                moduleNames.splice(i, 1)
            }
        }
    }

    function watch(dir?: string | FSWatcher, customWatcher?: FSWatcher) {
        let watchDir: string
        let watcher: FSWatcher
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
                    await load(path)
                    break
                case "unlink":
                    await remove(path)
                    break
                case "unlinkDir":
                    for (const modName of Object.keys(require.cache)) {
                        if (modName.startsWith(path)) {
                            await remove(modName)
                        }
                    }
                    await load()
                    break
            }
        })
    }

    return {
        load,
        watch,
        remove,
        moduleNames,
        get routes() {
            return moduleNames
                .map(modName => {
                    const mod = require.cache[modName]
                    return mod?.exports.default as FourzeRoute | FourzeRoute[]
                })
                .flat()
                .map(e => {
                    return {
                        ...e,
                        path: normalizeUrl(`${base}/${e.path}`)
                    }
                })
                .sort((a, b) => {
                    if (b.path.startsWith(a.path)) {
                        return 1
                    }
                    return b.path.localeCompare(a.path)
                })
        }
    }
}
