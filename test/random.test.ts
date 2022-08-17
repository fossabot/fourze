import { parseMockNumber, randomArray, randomItem } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("random", () => {
    it("work", () => {
        expect(parseMockNumber("200")).toBe(200)
        expect(parseMockNumber(300)).toBe(300)
        expect(parseMockNumber("abc")).toBeNaN()
        expect(parseMockNumber("300-600")).greaterThan(200).lessThanOrEqual(600)
        expect(parseMockNumber("600-900")).toBeLessThanOrEqual(900)
        const tmp = parseMockNumber(["200", 600, "900-1200"])
        expect(tmp).greaterThanOrEqual(200).lessThanOrEqual(1200)
    })

    it("random", () => {
        const array = randomArray(index => {
            return {
                name: `item-${index}`,
                count: parseMockNumber("200-500")
            }
        }, 30)
        const item = randomItem(array)
        expect(array).include(item)
    })
})
