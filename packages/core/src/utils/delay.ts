import { MaybeFn } from "../types"
import { randomInt } from "./random"

export type DelayMsType = MaybeFn<number | string>

export function delay(ms: DelayMsType) {
    const tmp = parseDelayMs(ms)
    return new Promise<void>(resolve => setTimeout(resolve, tmp))
}

function parseDelayMs(ms: DelayMsType): number {
    const tmp = typeof ms === "function" ? ms() : ms
    if (typeof tmp === "string") {
        if (tmp.match(/^\d+-\d+$/g)) {
            return randomInt(tmp)
        }
        return parseInt(tmp)
    }
    return tmp
}
