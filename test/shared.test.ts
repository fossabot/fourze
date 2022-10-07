import { createRouter, randomInt } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("shared", async () => {
    it("test-route", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }

        const router = createRouter(() => {
            return {
                base: "/v1",
                delay: "200-500"
            }
        }).use("/api/", route => {
            route.get("/test", () => {
                return {
                    ...testData
                }
            })
            route.get("//hello", () => {
                return {
                    ...testData
                }
            })
        })

        await router.setup()

        console.log(router.routes[0].finalPath)

        expect(router.match("/api/test")).toBeTruthy()
        expect(router.match("/v1/api/test")).toBeFalsy()
        expect(router.match("/hello")).toBeTruthy()
    })
})
