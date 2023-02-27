import type { FourzeMiddleware, PolyfillHeaderInit } from "@fourze/core";
import { defineMiddleware, flatHeaders } from "@fourze/core";

export function createHeaderMiddleware(init: PolyfillHeaderInit): FourzeMiddleware {
  const headers = flatHeaders(init);
  return defineMiddleware("Header", -1, async (_, res, next) => {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    await next?.();
  });
}
