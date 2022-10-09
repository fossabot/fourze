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
                route.get("/hello", () => {
                    return {
                        ...testData
                    }
                })
            })
        )

        await server.listen()

        await router.setup()

        const fetchReturn = await fetch("http://www.test.com/hello.json").then(r => r.json())
        const axiosReturn = await axios.get("http://www.test.com/hello.json").then(r => r.data)
        const originalReturn = await axios.get("http://localhost:7609/hello.json").then(r => r.data)

        expect(fetchReturn).toEqual(testData)
        expect(axiosReturn).toEqual(testData)
        expect(originalReturn).toEqual(testData)
    })
})
