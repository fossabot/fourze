import { defineFourzeHook } from "../shared"
import { delay, DelayMsType } from "../utils"

export function delayHook(ms: DelayMsType) {
    return defineFourzeHook(async (req, res, next) => {
        let time = await delay(ms)
        res.setHeader("Fourze-Delay", time)
    })
}
