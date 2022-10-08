import { createMockRouter, randomInt } from "@fourze/core"
import axios from "axios"
import { describe, expect, it } from "vitest"

describe("fetch", async () => {
    it("run-fetch", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }

        const router = createMockRouter({
            delay: "200-500"
        }).use(route => {
            route.get("http://www.test.com/hello", () => {
                return {
                    ...testData
                }
            })
        })

        await router.setup()

        const fetchReturn = await fetch("http://www.test.com/hello.json").then(r => r.json())
        const axiosReturn = await axios.get("http://www.test.com/hello.json").then(r => r.data)

        expect(fetchReturn).toEqual(testData)
        expect(axiosReturn).toEqual(testData)
    })
})
