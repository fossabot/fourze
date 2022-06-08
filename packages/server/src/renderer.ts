import path from "path"
import fs from "fs"
import { logger } from "@fourze/core"
import type { FourzeRequest, FourzeResponse } from "@fourze/core"
import type { FourzeMiddleware } from "./app"

export interface FourzeRendererOptions {
    dir?: string
    templates?: FourzeRenderTemplate[]
}

export type FourzeRenderer = FourzeMiddleware

export type FourzeRenderTemplate = (url: string) => any

export function renderFile(p: string) {
    const extensions = ["html", "htm"]
    const maybes = [p].concat(extensions.map(ext => path.normalize(`${p}/index.${ext}`)))
    do {
        p = maybes.shift()!
        if (!!p && fs.existsSync(p) && fs.statSync(p).isFile()) {
            return fs.readFileSync(p)
        }
    } while (!!p)
}

/**
 * @returns
 */
export function createRenderer(options?: FourzeRendererOptions | string): FourzeRenderer {
    const dir = (options && typeof options === "object" ? options.dir : options) ?? process.cwd()
    const templates = (options && typeof options == "object" ? options.templates : []) ?? []

    if (!templates.includes(renderFile)) {
        templates.push(renderFile)
    }

    return async function (request: FourzeRequest, response: FourzeResponse, next?: () => void | Promise<void>) {
        let p: string = path.join(dir, "/", request.relativePath)
        const temps = Array.from(templates)
        if (p) {
            p = path.normalize(p)
            while (temps.length) {
                const template = temps.shift()
                if (template) {
                    const content = template(p)
                    if (content) {
                        logger.info("render page", request.relativePath)
                        response.end(content)
                        return
                    }
                }
            }
        }

        await next?.()
    }
}
