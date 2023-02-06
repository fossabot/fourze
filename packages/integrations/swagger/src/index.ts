import {
  resolves
} from "@fourze/core";
import type {
  FourzeApp,
  FourzeMiddleware,
  FourzeNext,
  FourzeRequest,
  FourzeResponse
} from "@fourze/core";
import { getAbsoluteFSPath } from "swagger-ui-dist";

import { renderIndexHtml } from "./ui";
import type {
  SwaggerOptions
} from "./types";
import { createApiDocs } from "./docs";

export interface SwaggerUIServiceOptions extends SwaggerOptions {
  base?: string
  documentPath?: string
}

// 包括swagger-ui的服务
function service(
  app: FourzeApp,
  options: SwaggerUIServiceOptions = {}
): FourzeMiddleware {
  const base = options.base ?? "/swagger-ui/";
  const documentPath = options.documentPath ?? "/api-docs";
  const documentUrl = resolves(base, documentPath);

  const swaggerUISourcePath = getAbsoluteFSPath();

  const { staticFile } = require("@fourze/server");

  const render = staticFile(swaggerUISourcePath, base);
  const serviceDocs = createApiDocs(app, options);

  return async (req: FourzeRequest, res: FourzeResponse, next: FourzeNext) => {
    if (req.path.startsWith(base)) {
      if (req.path === documentUrl) {
        serviceDocs(req, res);
        return;
      }

      return render(req, res, () => {
        res.send(
          renderIndexHtml(base, {
            url: documentUrl
          }),
          "text/html"
        );
      });
    }
    return next();
  };
}

export * from "./types";

export { createApiDocs, renderIndexHtml, service, getAbsoluteFSPath as getSwaggerFSPath };
