import { createMockRouter, createRouter, randomInt, setLoggerLevel } from "@fourze/core"
import { createFourzeServer } from "@fourze/server"
import axios from "axios"
import nodeFetch from "node-fetch"
import { describe, expect, it } from "vitest"

describe("fetch", async () => {
    it("run-fetch", async () => {
        globalThis.fetch = nodeFetch as typeof globalThis.fetch
        const testData = {
            name: "test",
            count: randomInt(200)
        }
        setLoggerLevel("debug")

        const router = createMockRouter({
            delay: "200-500"
        }).use(route => {
            route.hook(async (req, res, next) => {
                res.setHeader("x-test", "abcd")
                res.appendHeader("x-test", "test")
                await next?.()
            })

            route.get("http://www.test.com/hello", () => {
                return {
                    ...testData
                }
            })

            route.get("http://localhost:7609/hello", () => {
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

        const server = createFourzeServer({
            port: 7609,
            host: "localhost"
        })

        const originalData = {
            name: "originalData",
            count: randomInt(200)
        }

        server.use(
            createRouter().use(route => {
                route.hook(async (req, res, next) => {
                    res.setHeader("x-test", "abcd")
                    res.appendHeader("x-test", "test")
                    await next?.()
                })

                route.get("/hello", () => {
                    return {
                        ...originalData
                    }
                })
            })
        )

        await server.listen()

        await router.setup()

        const fetchReturn = await fetch("http://localhost:7609/hello")

        const fetchReturnHeaders = fetchReturn.headers.get("x-test")

        expect(fetchReturnHeaders).include("test")

        const fetchReturnData = await fetchReturn.json()

        expect(fetchReturnData).toEqual(testData)

        const postData = {
            name: "test",
            count: 100
        }

        const originalFetchReturn = await fetch("http://localhost:7609/hello", {
            headers: {
                "x-fourze-mock": "off"
            }
        })

        const originalFetchReturnData = await originalFetchReturn.json()

        expect(originalFetchReturnData).toEqual(originalData)

        const axiosReturn = await axios.post("http://www.test.com/api/return", postData)

        const axiosReturnHeaders = axiosReturn.headers["x-test"]

        expect(axiosReturnHeaders).include("test")

        const axiosReturnData = axiosReturn.data

        expect(axiosReturnData).toEqual(postData)

        const originalReturn = await axios.get("http://localhost:7609/hello", {})

        const originalReturnHeaders = originalReturn.headers["x-test"]

        expect(originalReturnHeaders).include("test")

        const originalReturnData = originalReturn.data

        expect(originalReturnData).toEqual(testData)
    })
})
