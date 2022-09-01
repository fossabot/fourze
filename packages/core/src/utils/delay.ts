import { MaybeArray, MaybeFunction, MaybeNumber } from "maybe-types"
import { parseFakerNumber } from "./faker"

export type DelayMsType = MaybeFunction<MaybeArray<MaybeNumber>>

export function delay(ms: DelayMsType) {
    ms = typeof ms === "function" ? ms() : ms
    const tmp = parseFakerNumber(ms)
    return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}
