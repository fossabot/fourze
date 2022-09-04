import { MaybeArray, MaybeFunction, MaybeNumber, MaybePromise } from "maybe-types"
import { parseFakerNumber } from "./faker"

export type DelayMsType = MaybeFunction<MaybeArray<MaybeNumber>>

export function delay(ms: DelayMsType) {
    ms = typeof ms === "function" ? ms() : ms
    const tmp = parseFakerNumber(ms)
    return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}

export interface AsyncLock<R> {
    (): Promise<R>
    state: "ready" | "pending" | "done" | "error"
}

export function asyncLock<R = any>(fn: () => MaybePromise<R>): AsyncLock<R> {
    const listeners: ((data: R) => void)[] = []
    const errors = new Set<(err: any) => void>()
    let _state: AsyncLock<R>["state"] = "ready"
    let _result: R
    let error: any
    const lock = (async () => {
        switch (_state) {
            case "ready":
                _state = "pending"
                try {
                    return new Promise<R>(async (resolve, reject) => {
                        listeners.push(resolve)
                        errors.add(reject)

                        _result = await fn()
                        listeners.forEach(fn => fn(_result))
                        _state = "done"
                    })
                } catch (err) {
                    _state = "error"
                    error = err
                    errors.forEach(fn => fn(err))
                    return
                }

            case "pending":
                return new Promise<R>((resolve, reject) => {
                    listeners.push(resolve)
                    errors.add(reject)
                })
            case "done":
                return _result
            case "error":
                throw error
        }
    }) as AsyncLock<R>

    Object.defineProperties(lock, {
        state: {
            get() {
                return _state
            }
        }
    })

    return lock
}
