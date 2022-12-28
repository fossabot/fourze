import { defineFourzeHook } from "../shared";
import type { DelayMsType } from "../utils";
import { delay } from "../utils";

export function delayHook(ms: DelayMsType) {
  return defineFourzeHook(async (req, res, next) => {
    await next?.();
    const delayMs
      = res.getHeader("Fourze-Delay") ?? req.headers["Fourze-Delay"] ?? ms;
    const time = await delay(delayMs);
    res.setHeader("Fourze-Delay", time);
  });
}

export function jsonWrapperHook(
  resolve: (data: any) => any,
  reject?: (error: any) => any
) {
  return defineFourzeHook(async (req, res, next) => {
    const _json = res.json.bind(res);
    res.json = function (data) {
      return _json(resolve(data));
    };
    try {
      await next?.();
    } catch (error) {
      if (reject) {
        reject(error);
      } else {
        throw error;
      }
    }
  });
}
