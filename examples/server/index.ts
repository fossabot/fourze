import { defineFourze } from "@fourze/core"
import express from "express"
import { createProxyMiddleware } from "http-proxy-middleware"
import comporession from "compression"

import { CommonMiddleware, createApp, createRenderer, createRouter, FourzeMiddleware } from "@fourze/server"
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

const renderer = createRenderer({ dir: path.resolve(process.cwd(), "../web/dist"), fallbacks: { "/home": "/" } })

const app = createApp()
app.use("/test", comporession({ threshold: 0 }) as CommonMiddleware)
app.use(router, router2)
app.use(renderer)
app.listen(3000)
