import { createDelayMiddleware, createFilterMiddleware, createHeaderMiddleware, createResolveMiddleware, createTimeoutMiddleware } from "./middlewares";

export const middlewares = {
  delay: createDelayMiddleware,
  resolve: createResolveMiddleware,
  timeout: createTimeoutMiddleware,
  header: createHeaderMiddleware,
  filter: createFilterMiddleware
} as const;

export * from "./middlewares";
