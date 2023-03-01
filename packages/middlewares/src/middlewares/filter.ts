import type { MaybeRegex } from "maybe-types";
import type { FourzeMiddleware } from "@fourze/core";
import { defineMiddleware, isMatch } from "@fourze/core";

interface MatchMiddlewareOptions {
  includes?: MaybeRegex[]
  excludes?: MaybeRegex[]
}
export function createFilterMiddleware<T>(
  middleware: FourzeMiddleware<T>,
  options: MatchMiddlewareOptions
): FourzeMiddleware {
  const { includes = [], excludes = [] } = options;
  function isInclude(path: string) {
    let rs = true;
    if (includes.length) {
      rs &&= isMatch(path, ...includes);
    }
    if (excludes.length) {
      rs &&= !isMatch(path, ...excludes);
    }
    return rs;
  }
  return defineMiddleware(middleware.name ?? "Match", middleware.order ?? -1, async (req, res, next) => {
    const { path } = req;
    if (isInclude(path)) {
      await middleware(req, res, next);
    } else {
      await next?.();
    }
  });
}
