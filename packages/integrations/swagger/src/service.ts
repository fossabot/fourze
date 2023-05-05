import type { FourzeApp, FourzeMiddleware } from "@fourze/core";
import { createApp } from "@fourze/core";
import { getAbsoluteFSPath } from "swagger-ui-dist";
import { createSwaggerMiddleware } from "@fourze/middlewares";
import type { SwaggerOptions } from "@fourze/middlewares";
import { renderIndexHtml } from "./ui";

export interface SwaggerUIServiceOptions extends SwaggerOptions {
  base?: string
  documentPath?: string
}

// 包括swagger-ui的服务
export function service(
  app: FourzeApp,
  options: SwaggerUIServiceOptions = {}
): FourzeMiddleware {
  const base = options.base ?? "/swagger-ui/";
  const documentPath = options.documentPath ?? "/api-docs";

  const swaggerUISourcePath = getAbsoluteFSPath();

  const { staticFile } = require("@fourze/server") as typeof import("@fourze/server");

  const render = staticFile(swaggerUISourcePath, {
    maybes: []
  });

  const docsMiddleware = createSwaggerMiddleware(app, options);

  const swaggerApp = createApp();

  const renderIndex: FourzeMiddleware = (req, res, next) => {
    if (req.path === "/" || req.path === "/index.html") {
      res.send(renderIndexHtml(base), "text/html");
    } else {
      next?.();
    }
  };

  swaggerApp.use(documentPath, docsMiddleware);
  swaggerApp.use(base, render);
  swaggerApp.use(base, renderIndex);

  return swaggerApp;
}

export const getSwaggerFSPath = getAbsoluteFSPath;
