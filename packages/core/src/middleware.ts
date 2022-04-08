import { OutgoingMessage, IncomingMessage } from "http";
import {
  FourzeMiddlewareContext,
  FourzeRequest,
  FourzeResponse,
  FouzeServerContext,
  FOURZE_NOT_MATCH,
  transformRoute,
} from "./shared";

import logger from "./log";

export type RequestPath = `${"get" | "post" | "delete"}:${string}` | string;

export type DispatchFunction = (request: FourzeRequest) => any;

export function createResponse(res: OutgoingMessage) {
  const response = res as FourzeResponse;

  response.localData = {};

  response.json = function (data: any) {
    this.localData.result = data;
    this.setHeader("Content-Type", "application/json");
    this.write(JSON.stringify(data));
    this.end();
  };

  response.text = function (data: string) {
    this.localData.result = data;
    this.setHeader("Content-Type", "text/plain");
    this.end(data);
  };

  response.redirect = function (url: string) {
    this.statusCode = 302;
    this.setHeader("Location", url);
    this.end();
  };

  return response;
}

function createServerContext(
  req: IncomingMessage,
  res: OutgoingMessage
): Promise<FouzeServerContext> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const request = {
        url: req.url,
        method: req.method,
        body: body ? JSON.parse(body) : {},
        headers: req.headers,
      } as FourzeRequest;
      resolve({ request, response: createResponse(res) });
    });
    req.on("error", () => {
      reject(new Error("request error"));
    });
  });
}

export function createMiddleware(context: FourzeMiddlewareContext) {
  return async function (
    req: IncomingMessage,
    res: OutgoingMessage,
    next: () => void
  ) {
    const { request, response } = await createServerContext(req, res);

    let { routes } = context;

    let dispatchers = Array.from(routes.map((e) => transformRoute(e).match));

    for (let dispatch of dispatchers) {
      let result = dispatch(request, response);

      if (result != FOURZE_NOT_MATCH) {
        logger.info("request match", request.method, request.url);

        result = result ?? response.localData.result;
        const resolve = (body: any) => {
          if (!response.writableEnded) {
            response.json(body);
          }
        };
        if (result instanceof Promise) {
          result.then(resolve);
        } else {
          resolve(result);
        }
        return;
      }
    }

    next();
  };
}
