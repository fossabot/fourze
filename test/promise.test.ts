import { asyncLock, delay, DelayMsType } from "@fourze/core"
import { randomInt } from "crypto"
import { describe, expect, it } from "vitest"

describe("promise", () => {
    it("asynclock", async () => {
        const createInstance = () => randomInt(200)

        const fn = asyncLock(createInstance)

        const delayFn = function (ms: DelayMsType) {
            return async () => {
                await delay(ms)
                return fn()
            }
        }

        expect(fn.state).toBe("ready")

        const r = await fn()

        fn.release()

        expect(fn.state).toBe("ready")

        const [r0, r1] = await Promise.all([delayFn(300), delayFn("200-700")].map(r => r()))

        expect(r0).not.toBe(r)

        expect(r0).toBe(r1)
        expect(fn.state).toBe("done")
        expect(fn.callCount).toBe(3)
        const r2 = await delayFn("300-700")()
        expect(r2).toBe(r0)
        expect(fn.callCount).toBe(4)
    })
})
