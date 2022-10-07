import { createRouter, randomInt, relative } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("shared", async () => {
    it("test-relative", () => {
        const path = "https://test.com"
        const base = "/api"
        const final0 = relative(path, base)
        expect(final0).toBe(path)
        const finalPath = relative(final0, base)
        expect(finalPath).toEqual(path)
        expect(relative("//api/hello")).toEqual("/api/hello")
    })

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
            route.get("http://test.com/hello", () => {
                return {
                    ...testData
                }
            })

            route("POST://add", () => {
                return {
                    ...testData
                }
            })
        })

        await router.setup()

        expect(router.match("/api/test")).toBeFalsy()
        expect(router.match("/v1/api/test")).toBeTruthy()
        expect(router.match("http://test.com/hello")).toBeTruthy()
        expect(router.match("/v1/api/hello")).toBeFalsy()
        expect(router.match("/api/hello")).toBeFalsy()
        expect(router.match("/hello")).toBeFalsy()
        expect(router.match("/v1/hello")).toBeTruthy()
        expect(router.match("/v1/add", "post")).toBeTruthy()
    })
})
