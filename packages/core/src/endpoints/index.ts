import type { MaybePromise } from "maybe-types";
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
  resolve: (data: any) => MaybePromise<any>,
  reject?: (error: any) => MaybePromise<any>
) {
  return defineFourzeHook(async (req, res, next) => {
    try {
      await next?.();
      return await resolve(res.result);
    } catch (error) {
      if (reject) {
        return await reject(error);
      } else {
        throw error;
      }
    }
  });
}
