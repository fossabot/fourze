import { parseFakerNumber, randomArray, randomItem } from "@fourze/core"
import { describe, expect, it } from "vitest"

describe("random", () => {
    it("work", () => {
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
                count: parseFakerNumber("200-500")
            }
        }, 30)
        const item = randomItem(array)
        expect(array).include(item)
    })
})
