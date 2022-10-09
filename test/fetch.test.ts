import { createMockRouter, createRouter, randomInt, setLoggerLevel } from "@fourze/core"
import { createFourzeServer } from "@fourze/server"
import axios from "axios"
import { describe, expect, it } from "vitest"

describe("fetch", async () => {
    it("run-fetch", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }
        setLoggerLevel("debug")

        const router = createMockRouter({
            delay: "200-500"
        }).use(route => {
            route.hook((req, res) => {
                res.setHeader("x-test", "abcd")
                res.appendHeader("x-test", "test")
            })

            route.get("http://www.test.com/hello", () => {
                return {
                    ...testData
                }
            })
        })

        const server = createFourzeServer({
            port: 7609,
            host: "localhost"
        })

        server.use(
            createRouter().use(route => {
                route.hook((req, res) => {
                    res.setHeader("x-test", "abcd")
                    res.appendHeader("x-test", "test")
                })

                route.get("/hello", () => {
                    return {
                        ...testData
                    }
                })
            })
        )

        await server.listen()

        await router.setup()

        const fetchReturn = await fetch("http://www.test.com/hello.json")

        const fetchReturnHeaders = fetchReturn.headers.get("x-test")

        expect(fetchReturnHeaders).include("test")

        const fetchReturnData = await fetchReturn.json()

        expect(fetchReturnData).toEqual(testData)

        const axiosReturn = await axios.get("http://www.test.com/hello.json")

        const axiosReturnHeaders = axiosReturn.headers["x-test"]

        expect(axiosReturnHeaders).include("test")

        const axiosReturnData = axiosReturn.data

        expect(axiosReturnData).toEqual(testData)

        const originalReturn = await axios.get("http://localhost:7609/hello.json")

        const originalReturnHeaders = originalReturn.headers["x-test"]

        expect(originalReturnHeaders).include("test")

        const originalReturnData = originalReturn.data

        expect(originalReturnData).toEqual(testData)
    })
})
