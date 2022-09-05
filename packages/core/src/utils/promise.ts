import { MaybeArray, MaybeFunction, MaybeNumber, MaybePromise } from "maybe-types"
import { parseFakerNumber } from "./faker"

export type DelayMsType = MaybeFunction<MaybeArray<MaybeNumber>>

export function delay(ms: DelayMsType) {
    ms = typeof ms === "function" ? ms() : ms
    const tmp = parseFakerNumber(ms)
    return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}

export interface AsyncLock<R, Arg extends any[] = any[]> {
    (...args: Arg): Promise<R>
    release(): void
    readonly state: "ready" | "pending" | "done" | "error"
    readonly callCount: number
}

export function asyncLock<R = any, Arg extends any[] = any[]>(fn: (...args: Arg) => MaybePromise<R>): AsyncLock<R, Arg> {
    const listeners = new Set<(data: R) => void>()
    const errors = new Set<(err: any) => void>()
    let _state: AsyncLock<R>["state"] = "ready"
    let _result: R
    let _error: any
    let _callCount = 0

    const lock = ((...arg: Arg) => {
        _callCount++
        switch (_state) {
            case "ready":
                _state = "pending"
                try {
                    return new Promise<R>(async (resolve, reject) => {
                        listeners.add(resolve)
                        listeners.add(() => (_state = "done"))
                        errors.add(reject)

                        _result = await fn(...arg)
                        listeners.forEach(fn => fn(_result))
                    })
                } catch (err) {
                    _state = "error"
                    _error = err
                    errors.forEach(fn => fn(err))
                    return
                }

            case "pending":
                return new Promise<R>((resolve, reject) => {
                    listeners.add(resolve)
                    errors.add(reject)
                })
            case "done":
                return Promise.resolve(_result)
            case "error":
                return Promise.reject(_error)
        }
    }) as AsyncLock<R>

    lock.release = function () {
        _state = "ready"
        listeners.clear()
        errors.clear()
    }

    Object.defineProperties(lock, {
        state: {
            get() {
                return _state
            }
        },
        callCount: {
            get() {
                return _callCount
            }
        }
    })

    return lock
}
