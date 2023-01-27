import type { MaybePromise } from "maybe-types";
import type { FourzeMiddleware } from "../shared";
import { defineMiddleware } from "../shared";
import type { DelayMsType } from "../utils";
import { delay } from "../utils";

export const DELAY_HEADER = "Fourze-Delay";

export const DISABLE_JSON_WRAPPER_HEADER = "Fourze-Disable-Json-Wrapper";

export function delayHook(ms: DelayMsType): FourzeMiddleware {
  return defineMiddleware("Delay", async (req, res, next) => {
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
): FourzeMiddleware {
  return defineMiddleware("JsonWrapper", -1, async (req, res, next) => {
    const disableJsonWrapper = res.getHeader(DISABLE_JSON_WRAPPER_HEADER) as string;
    if (!disableJsonWrapper || ["false", "0", "off"].includes(disableJsonWrapper)) {
      const _send = res.send.bind(res);
      res.send = function (payload, contentType) {
        contentType = contentType ?? res.getContentType(payload);
        if (contentType?.startsWith("application/json")) {
          payload = resolve(payload);
        }
        _send(payload, contentType);
        return res;
      };

      if (reject) {
        const _sendError = res.sendError.bind(res);
        res.sendError = function (code, message) {
          _sendError(code, message);
          _send(reject(message), "application/json");
          return this;
        };
      }
    }

    await next();
  });
}

