import { createMockRouter, randomInt } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("hooks", async () => {
    it("test-hooks", async () => {
        const testData = {
            name: "test",
            count: randomInt(200)
        }

        const data = {
            token: "test-token"
        }

        const router = createMockRouter({
            delay: "200-500"
        })
            .use("/api", route => {
                route("GET /test", req => {
                    return {
                        token: req.meta.token
                    }
                })
                route("POST /test", req => {
                    return "anything"
                })
            })
            .use("/", route => {
                route.hook("/api", async (req, res, next) => {
                    if (req.headers["token"]) {
                        req.meta.token = req.headers["token"].toString().toUpperCase()
                    }
                    res.setHeader("token", data.token)
                })

                route.hook("/api/test", (req, res, next) => {
                    if (req.method == "post") {
                        res.result = "otherthing"
                    }
                })

                route.hook("/api/test", (req, res, next) => {
                    if (req.method == "post") {
                        console.log("do somethings")
                        return "something"
                    }
                })

                route.hook("/api/test", (req, res, next) => {
                    if (req.method == "post") {
                        console.log("after somethings")
                        return "unknown"
                    }
                })
            })

        await router.setup()

        const res = await fetch("/api/test", {
            headers: {
                token: data.token
            }
        }).then(r => r.json())

        expect(res.token).toEqual(data.token.toUpperCase())

        const res2 = await fetch("/api/test", { method: "post" })

        const resToken = res2.headers.get("token")

        expect(resToken).toEqual(data.token)

        const text = await res2.text()

        expect(text).toEqual("something")
    })
})
