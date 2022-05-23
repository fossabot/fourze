import { createFourze, defineRoutes, createRenderer } from "@fourze/core"
import fs from "fs"
import path from "path"

const keymap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export default createFourze()
    .request("/Search/:name", (req, res) => {
        const num = Number(req.params.name ?? 0)
        console.log(req.params)
        const rs: Record<string, Date> = {}
        for (let i = 0; i < num; i++) {
            const len = 10
            let str = ""
            for (let j = 0; j < len; j++) {
                str += keymap[randomInt(0, keymap.length - 1)]
            }
            rs[str] = new Date()
        }
        return rs
    })
    .request("/img/a.jpg", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./test.jpg"))
        res.image(f)
    })
    .request("/download/a", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./index.ts"))
        res.binary(f)
    })
    .request("/usa", () => {}).routes

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
