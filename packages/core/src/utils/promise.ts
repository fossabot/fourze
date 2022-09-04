import { MaybeArray, MaybeFunction, MaybeNumber, MaybePromise } from "maybe-types"
import { parseFakerNumber } from "./faker"

export type DelayMsType = MaybeFunction<MaybeArray<MaybeNumber>>

export function delay(ms: DelayMsType) {
    ms = typeof ms === "function" ? ms() : ms
    const tmp = parseFakerNumber(ms)
    return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}

type TaskState = "ready" | "pending" | "done" | "error"

export function asyncLock<R = any>(fn: () => MaybePromise<R>) {
    const listeners = new Set<(data: R) => void>()
    const errors = new Set<(err: any) => void>()
    let state: TaskState = "ready"
    let result: R
    let error: any
    return async () => {
        if (state === "ready") {
            try {
                state = "pending"
                result = await fn()
                listeners.forEach(e => e(result))
                state = "done"
            } catch (err) {
                error = err
                errors.forEach(e => e(err))
                state = "error"
            }
        } else if (state == "pending") {
            return new Promise<R>((resolve, reject) => {
                listeners.add(resolve)
                errors.add(reject)
            })
        } else if (state === "done") {
            return result
        } else if (state === "error") {
            throw new Error(error)
        }
    }
}
