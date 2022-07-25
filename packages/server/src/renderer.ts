import type { FourzeRequest, FourzeResponse } from "@fourze/core"
import { logger } from "@fourze/core"
import fs from "fs"
import mime from "mime"
import path from "path"
import type { FourzeMiddleware } from "./app"

export interface FourzeRendererOptions {
    /**
     * 根路径
     */
    base?: string

    /**
     *  目录
     */
    dir?: string

    /**
     *  模板
     */
    templates?: FourzeRenderTemplate[]

    /**
     *  文件不存在时跳转到该目录的根路径
     */
    fallbacks?: string[] | Record<string, string>
}

export type FourzeRenderer = FourzeMiddleware

export type FourzeRenderTemplate = (context: FourzeRendererContext) => any

export interface FourzeRendererContext {
    path: string
    request: FourzeRequest
    response: FourzeResponse
}

export function renderFile(context: FourzeRendererContext) {
    let p = context.path
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
export function createRenderer(options: FourzeRendererOptions | string = {}): FourzeRenderer {
    const dir = (options && typeof options === "object" ? options.dir : options) ?? process.cwd()
    const templates = (options && typeof options == "object" ? options.templates : []) ?? []
    const base = typeof options == "string" ? "/" : options.base ?? "/"
    const _fallbacks = (options && typeof options == "object" ? options.fallbacks : []) ?? []
    const fallbacks = Array.isArray(_fallbacks) ? _fallbacks.map(f => [f, f]) : Object.entries(_fallbacks)
    if (!templates.includes(renderFile)) {
        templates.push(renderFile)
    }

    async function render(context: FourzeRendererContext) {
        let content: Buffer | undefined
        for (let template of templates) {
            content = await template(context)
            if (!!content) {
                break
            }
        }
        return content
    }

    const renderer = async function (request: FourzeRequest, response: FourzeResponse, next?: () => void | Promise<void>) {
        const url = request.relativePath
        if (url.startsWith(base)) {
            const context = { path: path.join(dir, url), request, response }

            let content = await render(context)

            if (!content) {
                for (let [fr, to] of fallbacks) {
                    if (url.startsWith(fr)) {
                        to = path.normalize(path.join(dir, to))
                        context.path = to
                        content = await render(context)

                        if (!content) {
                            content = renderFile(context)
                        }

                        if (!!content) {
                            logger.info("fallback", url, " => ", to)
                            break
                        }
                    }
                }
            }

            if (content) {
                logger.info("render page", url)
                if (!response.hasHeader("Content-Type")) {
                    response.setHeader("Content-Type", mime.getType(url) ?? "text/html")
                }
                response.end(content)
                return
            }
        }

        await next?.()
    }

    Object.defineProperty(renderer, "name", {
        get() {
            return "FourzeRenderer"
        }
    })

    return renderer
}
