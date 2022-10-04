import { asyncLock, delay, DelayMsType, parseFakerNumber, randomArray, randomInt, randomItem } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("utils", () => {
    it("faker", () => {
        expect(parseFakerNumber("200")).toBe(200)
        expect(parseFakerNumber(300)).toBe(300)
        expect(parseFakerNumber("abc")).toBeNaN()
        expect(parseFakerNumber("300-600")).greaterThan(200).lessThanOrEqual(600)
        expect(parseFakerNumber("600-900")).toBeLessThanOrEqual(900)
        const tmp = parseFakerNumber(["200", 600, "900-1200"])
        expect(tmp).greaterThanOrEqual(200).lessThanOrEqual(1200)
    })

    it("random", () => {
        const array = randomArray(index => {
            return {
                name: `item-${index}`,
                count: randomInt("200-500")
            }
        }, 30)
        const item = randomItem(array)
        expect(array).include(item)
    })

    it("asynclock", async () => {
        const createInstance = () => randomInt("374-9197")

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
