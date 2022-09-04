import { asyncLock, delay } from "@fourze/core"
import { randomInt } from "crypto"
import { describe, expect, it } from "vitest"

describe("promise", () => {
    it("asynclock", async () => {
        const fn = asyncLock(async () => {
            await delay(2000)
            return randomInt(3000)
        })

        const [r0, r1] = await Promise.all([fn, fn].map(r => r()))
        expect(r0).toBe(r1)
    })
})
