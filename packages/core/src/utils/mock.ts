import type { Num } from "../types"
import { MaybeArray } from "./../types"
import { randomInt, randomItem } from "./random"

/**
 *
 * @example  "100-500" => randomInt(100, 500)
 * @example  "100" => 100
 * @example  300 => 300
 * @example  [100, 500,"600-900"] => randomItem([100,500,randomInt(600,900)])
 * @returns
 */
export function parseMockNumber(ms: MaybeArray<Num>): number {
    if (Array.isArray(ms)) {
        return parseMockNumber(randomItem(ms))
    }
    if (typeof ms === "string") {
        if (ms.match(/^\d+-\d+$/g)) {
            return randomInt(ms)
        }
        return parseInt(ms)
    }
    return ms
}

export function isMockNumber(num: Num) {
    return typeof num == "number" || /^\d+(\-\d+)?$/g.test(num)
}

export function isMockBoolean(bool: boolean | string) {
    return typeof bool == "boolean" || /^(true|false)$/g.test(bool)
}

export interface MockObjectOption {
    deep?: boolean
}

export function parseMockString(str: string) {
    if (isMockNumber(str)) {
        return parseMockNumber(str)
    }
    if (isMockBoolean(str)) {
        return Boolean(str)
    }
    return str
}

/**
 *
 *  {
 * 		a :"100",
 * 		b :"300-600",
 * 		c : "8799",
 * 		d : ["100",30,"400-900"],
 * 		e : {
 * 			a :"100-300"
 * 		}
 * 	}
 *
 * @param obj
 * @param param1
 */
export function parseMockObject(obj: MaybeArray<Num | Record<string, any>>, options: MockObjectOption = {}): any {
    if (Array.isArray(obj)) {
        return obj.map(v => parseMockObject(v, options))
    }

    if (typeof obj == "number") {
        return obj
    }

    if (typeof obj == "boolean") {
        return obj
    }

    if (typeof obj == "string") {
        if (isMockNumber(obj)) {
            return parseMockNumber(obj)
        }
        return obj
    }

    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => {
            if (Array.isArray(v)) {
                return [k, v.map(f => parseMockObject(f))]
            }
            return [k, parseMockObject(v)]
        })
    )
}
