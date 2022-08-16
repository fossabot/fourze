import { defineFourzeHook } from "../shared"
import { delay, DelayMsType } from "../utils"

export function delayHook(ms: DelayMsType) {
    return defineFourzeHook(async (req, res, handle) => {
        await delay(ms)
        await handle(req, res)
    })
}
