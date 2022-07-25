import comporession from "compression"
import ejs from "ejs"
import { transform } from "esbuild"

import { CommonMiddleware, createApp, createRenderer, createRouter, FourzeRendererContext } from "@fourze/server"
import fs from "fs"
import path from "path"

const router = createRouter(route => {
    route("GET:/hello", () => {
        return {
            msg: "hello router 1"
        }
    })
})

const router2 = createRouter(route => {
    route("GET:/test/hello", () => {
        return {
            msg: "hello router 2"
        }
    })
})

export async function renderEjs(context: FourzeRendererContext) {
    const file = path.normalize(context.path)
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return ejs.renderFile(file, {})
    }
}

export async function rendertsx(context: FourzeRendererContext) {
    const file = path.normalize(context.path)

    const maybes = [file].concat(["index.tsx", "index.jsx"].map(ext => path.normalize(`${file}/${ext}`)))

    for (let maybe of maybes) {
        if (fs.existsSync(maybe) && fs.statSync(maybe).isFile()) {
            const raw = fs.readFileSync(maybe).toString()
            const { code } = await transform(raw, {
                target: "esnext",
                format: "esm",
                loader: "tsx",
                banner: "import {createElement} from '@fourze/core'",

                tsconfigRaw: {
                    compilerOptions: {
                        jsxFactory: "createElement",
                        jsxFragmentFactory: "Fragment"
                    }
                }
            })

            const tmp = path.normalize(maybe.replace(".tsx", ".tmp.js"))

            delete require.cache[tmp]

            fs.writeFileSync(tmp, code)

            const { default: mod } = await require(tmp)

            const { render } = mod
            fs.rmSync(tmp)

            if (render && typeof render === "function") {
                let content = await render()
                if (typeof content == "function") {
                    content = content()
                }
                context.response.setHeader("Content-Type", "text/html; charset=utf-8")

                return content
            }
        }
    }
}

const renderer = createRenderer({ dir: path.resolve(process.cwd(), "../web/dist"), fallbacks: { "/home": "/" } })

const ejsRenderer = createRenderer({ templates: [renderEjs], fallbacks: { "/ejs": "/ejs/index.ejs" } })
const tsxRenderer = createRenderer({ templates: [rendertsx] })

const app = createApp({})

app.use("/test", comporession({ threshold: 0 }) as CommonMiddleware)
app.use(router, router2)
app.use("/ejs", ejsRenderer)
app.use("/tsx", tsxRenderer)

app.use(renderer)
app.listen()
