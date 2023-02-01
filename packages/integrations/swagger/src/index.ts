import { DISABLE_JSON_WRAPPER_HEADER, resolves } from "@fourze/core";
import type {
  FourzeApp,
  FourzeMiddleware,
  FourzeNext,
  FourzeRequest
  , FourzeResponse

} from "@fourze/core";
import { getAbsoluteFSPath } from "swagger-ui-dist";
import { staticFile } from "@fourze/server";

import { renderIndexHtml } from "./ui";
import { createApiDocs } from "./shared";
import type { SwaggerOptions } from "./types";

export interface SwaggerUIServiceOptions extends SwaggerOptions {
  base?: string
  documentPath?: string
}

export function service(
  app: FourzeApp,
  options: SwaggerUIServiceOptions = {}
): FourzeMiddleware {
  const base = options.base ?? "/swagger-ui/";
  const documentPath = options.documentPath ?? "/swagger.json";
  const documentUrl = resolves(base, documentPath);

  const swaggerUISourcePath = getAbsoluteFSPath();

  const render = staticFile(swaggerUISourcePath, base);

  return async (req: FourzeRequest, res: FourzeResponse, next: FourzeNext) => {
    if (req.path.startsWith(base)) {
      if (req.path === documentUrl) {
        const docs = createApiDocs(app, {
          ...options
        });
        res.setHeader(DISABLE_JSON_WRAPPER_HEADER, "true");
        res.send(docs, "application/json");
        return;
      }

      return render(req, res, () => {
        res.send(renderIndexHtml(base, {
          url: documentUrl
        }), "text/html");
      });
    }
    return next();
  };
}

export { renderIndexHtml } from "./ui";
export { createApiDocs } from "./shared";

export { getAbsoluteFSPath as getSwaggerFSPath } from "swagger-ui-dist";
export * from "./types";
