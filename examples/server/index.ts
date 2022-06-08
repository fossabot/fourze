import { defineFourze } from "@fourze/core"
import express from "express"
import { createProxyMiddleware } from "http-proxy-middleware"

import { createApp, createRenderer, createRouter, FourzeMiddleware } from "@fourze/server"
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

const renderer = createRenderer(path.resolve(process.cwd(), "./pages"))

const app = createApp()
app.use([router, router2])
app.use(renderer)

const ex = express()
ex.use(app)

ex.use(
    createProxyMiddleware("/api", {
        target: "http://127.0.0.1:3000/",
        pathRewrite: {
            "^/api": ""
        }
    })
)

ex.listen(3000)
