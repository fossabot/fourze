import { defineFourze, FourzeHandle, jsonWrapperHook, randomDate, randomInt } from "@fourze/core"
import dayjs from "dayjs"
import fs from "fs"
import path from "path"
import { successResponseWrap } from "../utils/setup-mock"
import { PolyfillFile } from "./../../../../packages/core/src/polyfill/form-data"

const keymap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export default defineFourze(fourze => {
    const cache: Record<string, any> = {}

    fourze.hook(jsonWrapperHook((data, req, res) => successResponseWrap(data, req.url)))

    const handleSearch: FourzeHandle = async (req, res) => {
        const num = Number(req.params.name ?? 0)
        const phone: number = req.body.phone ?? 1
        const rs: Record<string, string> = {}
        for (let i = 0; i < num + phone; i++) {
            const len = 10
            let str = ""
            for (let j = 0; j < len; j++) {
                str += keymap[randomInt(0, keymap.length - 1)]
            }
            rs[str] = `---[${dayjs(randomDate("2022-07-09", "2024-08-12")).format("YYYY-MM-DD HH:mm:ss")}] ---- ${phone}`
        }
        return rs
    }

    fourze("POST http://test.com/Search/{name}", handleSearch)

    fourze("POST /search/{name}", handleSearch)

    fourze("/img/avatar.jpg", async (req, res) => {
        let avatarPath = path.resolve(__dirname, ".tmp/avatar.jpg")
        if (!fs.existsSync(avatarPath)) {
            avatarPath = path.resolve(__dirname, "./test.webp")
        }
        res.setHeader("Fourze-Delay", 0)
        const f = await fs.promises.readFile(avatarPath)
        res.image(f)
    })

    fourze("/upload/avatar", async (req, res) => {
        const file = req.body.file as PolyfillFile
        if (!!file?.body) {
            if (!fs.existsSync(path.resolve(__dirname, ".tmp"))) {
                fs.mkdirSync(path.resolve(__dirname, ".tmp"))
            }

            await fs.promises.writeFile(path.resolve(__dirname, ".tmp/avatar.jpg"), file.body)
            return {
                size: file.size
            }
        }
        return {
            size: 0
        }
    })

    return []
})
