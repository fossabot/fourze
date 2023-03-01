import { definePlugin } from "@fourze/core";
import { middlewares } from "@fourze/middlewares";
import { failResponseWrap, successResponseWrap } from "../utils/setup-mock";

export default definePlugin((app) => {
  const { header, resolve, filter } = middlewares;
  app.use(header({
    "Content-Type": "application/json"
  }));
  app.use(filter(resolve(successResponseWrap, failResponseWrap), {
    excludes: [
      "/v1/health"
    ]
  }));
});
