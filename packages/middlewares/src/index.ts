import { createDelayMiddleware, createFilterMiddleware, createHeaderMiddleware, createResolveMiddleware, createSwaggerMiddleware, createTimeoutMiddleware } from "./middlewares";

export const middlewares = {
  delay: createDelayMiddleware,
  resolve: createResolveMiddleware,
  timeout: createTimeoutMiddleware,
  swagger: createSwaggerMiddleware,
  header: createHeaderMiddleware,
  filter: createFilterMiddleware
} as const;

export * from "./middlewares";
