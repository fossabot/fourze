import { randomInt, setLoggerLevel } from "@fourze/core"
import { createMockRouter } from "@fourze/mock"
import nodeFetch from "node-fetch"
import { describe, expect, it } from "vitest"

describe("fetch", async () => {
    it("mock-fetch", async () => {
        globalThis.fetch = nodeFetch as typeof globalThis.fetch
        const testData = {
            name: "test",
            count: randomInt(200)
        }
        setLoggerLevel("debug")

        const router = createMockRouter({
            delay: "200-500",
            mode: ["fetch"],
            external: ["http://localhost:7609"]
        }).use(route => {
            route.hook(async (req, res, next) => {
                res.setHeader("x-test", "abcd")
                res.appendHeader("x-test", "test")
                await next?.()
            })

            route.get("http://localhost:7609/hello", (req, res) => {
                return {
                    ...testData
                }
            })

            route.post("http://www.test.com/api/return", req => {
                return {
                    ...req.data
                }
            })
        })

        await router.setup()

        const fetchReturn = await fetch("http://localhost:7609/hello")

        const fetchReturnHeaders = fetchReturn.headers.get("x-test")

        expect(fetchReturnHeaders).include("test")

        const fetchReturnData = await fetchReturn.json()

        expect(fetchReturnData).toEqual(testData)
    })
})
