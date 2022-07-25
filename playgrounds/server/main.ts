import comporession from "compression"
import ejs from "ejs"
import { transform } from "esbuild"

import { CommonMiddleware, createApp, createRenderer, createRouter } from "@fourze/server"
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

export async function renderEjs(p: string) {
    const file = path.resolve(process.cwd(), path.normalize(p))
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return ejs.renderFile(file, {})
    }
}

export function createFourzeElement(tag: string, props: any = {}, ...children: string[]) {
    if (!props || typeof props != "object" || Array.isArray(props)) {
        props = {}
    }

    if (props.class && Array.isArray(props.class)) {
        props.class = props.class.join(" ")
    }

    function renderChildren(children: string[]): string {
        if (Array.isArray(children)) {
            return children.map(c => (Array.isArray(c) ? renderChildren(c) : c)).join("")
        }
        return children
    }

    return (
        "<" +
        tag +
        " " +
        Object.entries(props)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ") +
        ">" +
        renderChildren(children) +
        "</" +
        tag +
        ">"
    )
}

export async function rendertsx(p: string) {
    const file = path.resolve(process.cwd(), path.normalize(p))
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const raw = fs.readFileSync(file).toString()
        const { code } = await transform(raw, {
            target: "esnext",
            format: "cjs",
            loader: "tsx",
            tsconfigRaw: {
                compilerOptions: {
                    jsxFactory: "createFourzeElement",
                    jsxFragmentFactory: "Fragment"
                }
            }
        })

        const { default: mod } = await eval(code)
        const { render } = mod
        if (render && typeof render === "function") {
            let content = await render()
            if (typeof content == "function") {
                content = content()
            }
            return content
        }
    }
}

const renderer = createRenderer({ dir: path.resolve(process.cwd(), "../web/dist"), fallbacks: { "/home": "/" } })

const ejsRenderer = createRenderer({ templates: [renderEjs], fallbacks: { "/ejs": "/ejs/index.ejs" } })
const tsxRenderer = createRenderer({ templates: [rendertsx], fallbacks: { "/tsx": "/tsx/index.tsx" } })

const app = createApp({})

app.use("/test", comporession({ threshold: 0 }) as CommonMiddleware)
app.use(router, router2)
app.use("/ejs", ejsRenderer)
app.use("/tsx", tsxRenderer)

app.use(renderer)
app.listen()
