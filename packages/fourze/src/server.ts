import { OutgoingMessage, IncomingMessage } from "http";
import {
  FourzeMiddlewareContext,
  FourzeRequest,
  FourzeResponse,
  FouzeServerContext,
  FOURZE_NOT_MATCH,
  transformRoute,
} from "@fourze/shared";

export type RequestPath = `${"get" | "post" | "delete"}:${string}` | string;

export type DispatchFunction = (request: FourzeRequest) => any;

export function createResponse(res: OutgoingMessage) {
  const response = res as FourzeResponse;

  response.json = function (data: any) {
    this.setHeader("Content-Type", "application/json");
    this.write(JSON.stringify(data));
    this.end();
  };

  response.text = function (data: string) {
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
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      const request = {
        url: req.url,
        method: req.method,
        data: data ? JSON.parse(data) : {},
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
      const result = dispatch(request, response);

      if (result != FOURZE_NOT_MATCH) {
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

export function setTimeoutAsync(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
