import { defineFourzeHook, FourzeRequest, FourzeResponse } from "../shared"
import { delay, DelayMsType } from "../utils"

export function delayHook(ms: DelayMsType) {
    return defineFourzeHook(async (req, res, next) => {
        await next?.()
        let time = await delay(ms)
        res.setHeader("Fourze-Delay", time)
    })
}

export function jsonWrapperHook(fn: (data: any, req: FourzeRequest, res: FourzeResponse) => any) {
    return defineFourzeHook(async (req, res, next) => {
        const _json = res.json.bind(res)
        res.json = function (data) {
            return _json(fn(data, req, res))
        }
        await next?.()
    })
}
