import { defineFourze, FourzeHandle, randomInt } from "@fourze/core"

const keymap = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export default defineFourze(fourze => {
    fourze([
        {
            path: "/test",
            method: "get",
            handle(req, res) {}
        }
    ])

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
            rs[str] = `${new Date().toString()} ---- ${phone}`
        }
        return rs
    }

    fourze("POST http://test.com/Search/:name", handleSearch)

    fourze("POST /search/:name", handleSearch)

    fourze("post /upload", async (req, res) => {})

    return []
})
