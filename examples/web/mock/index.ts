import { defineRoute, render } from "@fourze/core"
import fs from "fs"
import path from "path"

const keymap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export default defineRoute(fourze => {
    fourze("/Search/:name", (req, res) => {
        const num = Number(req.params["numsdjkajsda{jsksjda}s"] ?? 0)
        console.log(req.params)
        const rs = []
        for (let i = 0; i < num; i++) {
            const len = 10
            let str = ""
            for (let j = 0; j < len; j++) {
                str += keymap[randomInt(0, keymap.length - 1)]
            }
            rs.push(str)
        }
        return rs
    })

    fourze("/search/a.jpg", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./test.jpg"))
        res.image(f)
    })

    fourze("/static/", render(path.resolve(__dirname, "./")))

    fourze("/download/a", async (req, res) => {
        const f = await fs.promises.readFile(path.resolve(__dirname, "./index.ts"))
        res.binary(f)
    })
})

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
