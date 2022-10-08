import { createRouter, isMatch, randomInt, resolvePath } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("shared", async () => {
    it("test-reslovePath", () => {
        const path = "https://test.com"
        const base = "/api"
        const final0 = resolvePath(path, base)
        expect(final0).toBe(path)
        const finalPath = resolvePath(final0, base)
        expect(finalPath).toEqual(path)
        expect(resolvePath("//api/hello")).toEqual("/api/hello")
    })

    it("test-isMatch", () => {
        expect(isMatch("/api/hello/test", "/api/*", "/api/hello")).toBe(true)
        expect(isMatch("http://www.test.com", "http://**.test.com")).toBe(true)
    })

    it("test-route", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }

        const router = createRouter(() => {
            return {
                base: "/v1",
                delay: "200-500",
                allow: ["/api/**", "/hello", "/add", "/deny"],
                deny: ["/deny"],
                external: ["http://www.test.com"]
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

            route.get("/noallow", () => {
                return "not-allow"
            })

            route("get http://test.com/hello", () => {
                return {
                    ...testData
                }
            })

            route("GET http://www.test.com/hello", () => {
                return {
                    ...testData
                }
            })

            route.get("//deny", () => {
                return "deny"
            })

            route("POST //add", () => {
                return {
                    ...testData
                }
            })
        })

        await router.setup()

        // has not base
        expect(router.match("/api/test")).toBeFalsy()
        // has base
        expect(router.match("/v1/api/test")).toBeTruthy()

        // in external
        expect(router.match("http://www.test.com/hello")).toBeTruthy()
        // not in external
        expect(router.match("http://test.com/hello")).toBeFalsy()

        // not in allow
        expect(router.match("/v1/api/hello")).toBeFalsy()
        expect(router.match("/api/hello")).toBeFalsy()
        expect(router.match("/hello")).toBeFalsy()
        expect(router.match("/v1/noallow")).toBeFalsy()

        // in allow
        expect(router.match("/v1/hello")).toBeTruthy()
        expect(router.match("/v1/add", "post")).toBeTruthy()

        // in deny
        expect(router.match("/v1/deny")).toBeFalsy()
    })
})
