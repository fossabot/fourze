import { createFourzeServer } from "@fourze/server"
import { createRouter, randomInt, setLoggerLevel } from "@fourze/core"
import { createMockRouter } from "@fourze/mock"
import axios from "axios"
import { describe, expect, it } from "vitest"

describe("data", async () => {
    it("mock-data", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }
        setLoggerLevel("debug")

        const server = createFourzeServer({
            host: "localhost",
            port: 7609
        })

        const router = createRouter({
            delay: "200-500",
            external: ["http://localhost:7609"],
            base: "/"
        }).use(route => {
            route.post(
                "/hello",
                {
                    name: {
                        type: String
                    }
                },
                (req, res) => {
                    return {
                        name: req.data.name
                    }
                }
            )
        })

        await server.use(router).listen()

        const { name } = await axios.post<typeof testData>("http://localhost:7609/hello", testData).then(r => r.data)

        expect(name).toEqual(testData.name)
    })
})
