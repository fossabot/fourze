import { defineRoutes, createRenderer } from "@fourze/core"
import fs from "fs"
import path from "path"

const keymap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export default defineRoutes(fourze => {
    fourze.request("/search/:name", async (req, res) => {
        const num = Number(req.params.name ?? 0)
        const phone: number = req.body.phone ?? 1
        const rs: Record<string, string> = {}
        for (let i = 0; i < num + phone; i++) {
            const len = 10
            let str = ""
            for (let j = 0; j < len; j++) {
                str += keymap[randomInt(0, keymap.length - 1)]
            }
            rs[str] = `${new Date().toString()} ---- ${phone}`
        }
        console.log(rs)
        return rs
    })
    fourze.request("/img/a.jpg", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./test.jpg"))
        res.image(f)
    })
    fourze.request("/download/a", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./index.ts"))
        res.binary(f)
    })
})

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
