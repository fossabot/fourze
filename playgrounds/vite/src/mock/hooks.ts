import { definePlugin } from "@fourze/core";
import { createHeaderMiddleware, createResolveMiddleware } from "@fourze/middlewares";
import { failResponseWrap, successResponseWrap } from "../utils/setup-mock";

export default definePlugin((app) => {
  app.use(createHeaderMiddleware({
    "Content-Type": "application/json"
  }));
  app.use(createResolveMiddleware(successResponseWrap, failResponseWrap));
});
