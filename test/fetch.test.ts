import { createMockRouter, randomInt } from "@fourze/core"
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
            route.get("http://www.test.com/hello", (req, res) => {
                return {
                    ...testData
                }
            })
        })

        await router.setup()

        const res = await fetch("http://www.test.com/hello").then(r => r.json())
        expect(res).toEqual(testData)
    })
})
