import type {
  Func,
  MaybeArray,
  MaybeAsyncFunction,
  MaybeFunction,
  MaybeNumber,
  MaybePromise,
} from "maybe-types"
import { parseFakerNumber } from "./faker"
import { isFunction } from "./is"

export type DelayMsType = MaybeFunction<MaybeArray<MaybeNumber>>

export function delay(ms: DelayMsType) {
  ms = isFunction(ms) ? ms() : ms
  const tmp = parseFakerNumber(ms)
  return new Promise<number>(resolve => setTimeout(() => resolve(tmp), tmp))
}

export interface AsyncLock<R = void, Args extends any[] = any[]>
  extends Func<Promise<R>, Args> {
  release(): void
  readonly state: "ready" | "pending" | "done" | "error"
  readonly callCount: number
}

export interface SingletonPromiseReturn<T> {
  (): Promise<T>
  /**
   * Reset current staled promise.
   * Await it to have proper shutdown.
   */
  reset: () => Promise<void>
}

/**
 * Create singleton promise function
 *
 * @category Promise
 * @see https://github.com/antfu/utils/blob/main/src/promise.ts
 */
export function createSingletonPromise<T>(
  fn: MaybeAsyncFunction<T>,
): SingletonPromiseReturn<T> {
  let _promise: Promise<T> | undefined

  function wrapper() {
    if (!_promise) {
      _promise = Promise.resolve(fn())
    }
    return _promise
  }

  wrapper.reset = async () => {
    const _prev = _promise
    _promise = undefined
    if (_prev) {
      await _prev
    }
  }

  return wrapper
}

export function asyncLock<R = void, Args extends any[] = any[]>(
  fn: Func<MaybePromise<R>, Args>,
): AsyncLock<R, Args> {
  const listeners = new Set<(data: R) => void>()
  const errors = new Set<(err: any) => void>()
  let _state: AsyncLock<R>["state"] = "ready"
  let _result: R
  let _error: any
  let _callCount = 0

  const lock = ((...arg: Args) => {
    _callCount++
    switch (_state) {
      case "ready":
        _state = "pending"

        /* eslint no-async-promise-executor:"off" */
        return new Promise<R>(async (resolve, reject) => {
          listeners.add(resolve)
          errors.add(reject)

          try {
            _result = await fn(...arg)
            _state = "done"
            listeners.forEach(f => f(_result))
          }
          catch (err) {
            _state = "error"
            _error = err
            errors.forEach(f => f(err))
          }
        })

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
      },
    },
    callCount: {
      get() {
        return _callCount
      },
    },
  })

  return lock
}
