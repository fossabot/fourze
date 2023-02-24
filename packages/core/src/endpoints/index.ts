import type { MaybePromise, MaybeRegex } from "maybe-types";
import { delay, isError, isMatch, isUndef, overload } from "../utils";
import type { FourzeMiddleware, PropType } from "../shared";
import { defineMiddleware } from "../shared";
import type { DelayMsType } from "../utils";

export const DELAY_HEADER = "Fourze-Delay";

export const JSON_WRAPPER_HEADER = "Fourze-Json-Wrapper";

export function delayHook(ms: DelayMsType): FourzeMiddleware {
  return defineMiddleware("Delay", -1, async (req, res, next) => {
    const _send = res.send.bind(res);

    res.send = function (...args: any[]) {
      const delayMs = res.getHeader(DELAY_HEADER) ?? req.headers[DELAY_HEADER] ?? req.meta[DELAY_HEADER] ?? ms;
      delay(delayMs).then((ms) => {
        if (!res.writableEnded) {
          res.setHeader(DELAY_HEADER, ms);
          _send(...args as Parameters<typeof _send>);
        }
      });
      return res;
    };

    await next?.();
  });
}

export type JsonWrapperResolveFunction = (data: any) => MaybePromise<any>;

export interface JsonWrapperOptions {
  resolve: JsonWrapperResolveFunction
  reject?: JsonWrapperResolveFunction
  includes?: MaybeRegex[]
  excludes?: MaybeRegex[]
}

export function jsonWrapperHook(options: JsonWrapperOptions): FourzeMiddleware;

export function jsonWrapperHook(
  resolve: (data: any) => MaybePromise<any>,
  reject?: (error: any) => MaybePromise<any>
): FourzeMiddleware;

export function jsonWrapperHook(
  ...args: [JsonWrapperOptions] | [JsonWrapperResolveFunction, JsonWrapperResolveFunction?]
): FourzeMiddleware {
  const excludes: MaybeRegex[] = [];
  const includes: MaybeRegex[] = [];

  const { resolve: argResolve, reject: argReject, options } = overload({
    resolve: {
      type: Function as PropType<JsonWrapperResolveFunction>
    },
    reject: {
      type: Function as PropType<JsonWrapperResolveFunction>
    },
    options: {
      type: Object as PropType<JsonWrapperOptions>
    }
  }, args);

  const resolve = options?.resolve ?? argResolve;
  const reject = options?.reject ?? argReject;

  if (options?.excludes?.length) {
    excludes.push(...options.excludes);
  }
  if (options?.includes?.length) {
    includes.push(...options.includes);
  }

  if (!resolve) {
    throw new Error("Missing resolve function");
  }

  function isExclude(path: string) {
    if (includes.length) {
      return !isMatch(path, ...includes);
    }
    if (excludes.length) {
      return isMatch(path, ...excludes);
    }
    return false;
  }

  return defineMiddleware("JsonWrapper", -1, async (req, res, next) => {
    const _send = res.send.bind(res);
    res.send = function (payload, contentType) {
      contentType = contentType ?? req.meta.contentType ?? res.getContentType();
      const useJsonWrapper = res.getHeader(JSON_WRAPPER_HEADER) as string;
      const isAllow = (isUndef(useJsonWrapper) || !["false", "0", "off"].includes(useJsonWrapper)) && !isExclude(req.path) && (!contentType || contentType.startsWith("application/json"));

      if (isAllow) {
        if (isError(payload) && reject) {
          payload = reject(payload) ?? payload;
        } else {
          payload = resolve(payload) ?? payload;
        }
      }

      _send(payload, contentType);
      return res;
    };

    await next();
  });
}

