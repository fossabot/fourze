import type { MaybeArray, MaybeFn, Num } from "../types"
import { parseMockNumber } from "./mock"

export type DelayMsType = MaybeFn<MaybeArray<Num>>

export function delay(ms: DelayMsType) {
    ms = typeof ms === "function" ? ms() : ms
    const tmp = parseMockNumber(ms)
    return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}
