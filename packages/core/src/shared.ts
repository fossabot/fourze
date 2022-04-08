import type { ServerResponse } from "http";
import qs from "query-string";

export interface FouzeServerContext {
  request: FourzeRequest;
  response: FourzeResponse;
}

export interface FourzeRequest {
  url: string;
  method?: string;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
  /**
   *  {...query, ...params, ...body}
   */
  data: Record<string, any>;
  headers: Record<string, string | string[]>;
}

export interface FourzeResponse extends ServerResponse {
  json(data: any): void;
  text(data: string): void;
  redirect(url: string): void;
  localData: Record<string, any>;
}

export interface FourzeRoute {
  path: string;
  method?: string;
  handle: FourzeHandle;
}

export interface FourzeMiddlewareContext {
  base: string;
  routes: FourzeRoute[];
}

export type FourzeHandle = (
  request: FourzeRequest,
  response: FourzeResponse
) => any | Promise<any>;

export type Fourze = {
  [K in RequestMethod]: (path: string, handle: FourzeHandle) => Fourze;
} & {
  (path: string, method: RequestMethod, handle: FourzeHandle): Fourze;
  (path: string, handle: FourzeHandle): Fourze;
};

export type FourzeSetup = (fourze: Fourze) => void | FourzeRoute[];
export const FOURZE_NOT_MATCH = Symbol("FOURZE_NOT_MATCH");

export const FOURZE_METHODS: RequestMethod[] = [
  "get",
  "post",
  "delete",
  "put",
  "patch",
  "options",
  "head",
  "trace",
  "connect",
];

export type RequestMethod =
  | "get"
  | "post"
  | "delete"
  | "put"
  | "patch"
  | "head"
  | "options"
  | "trace"
  | "connect";

function parseQuery(url: string) {
  return qs.parse(url.slice(url.indexOf("?") + 1), {
    parseNumbers: true,
    parseBooleans: true,
  });
}

export interface FourzeOptions {
  base?: string;
  setup: FourzeSetup;
}

export function defineRoute(options: FourzeSetup | FourzeOptions) {
  const isFn = typeof options === "function";
  const base = isFn ? "" : options.base ?? "";
  const setup = isFn ? options : options.setup;

  let routes: FourzeRoute[] = [];

  let extra: FourzeRoute[] | void;

  if (typeof setup === "function") {
    const fourze = (
      url: string,
      param1: string | FourzeHandle,
      param2?: FourzeHandle
    ) => {
      let method: string | undefined = undefined;
      let handle: FourzeHandle;

      if (typeof param1 === "string") {
        method = param1 as RequestMethod;
        handle = param2 as FourzeHandle;
      } else {
        handle = param1 as FourzeHandle;
      }

      routes.push({
        path: url,
        method,
        handle,
      });
      return fourze;
    };

    Object.assign(
      fourze,
      Object.fromEntries(
        FOURZE_METHODS.map((method) => [
          method,
          (path: string, handle: FourzeHandle) => {
            return fourze(path, method, handle);
          },
        ])
      )
    );
    extra = setup(fourze as Fourze);
  } else {
    extra = setup as FourzeRoute[];
  }

  if (Array.isArray(extra)) {
    routes.push(...extra);
  }

  routes = routes.map((e) => {
    let path = e.path;

    if (e.path.startsWith("@")) {
      path = e.path.slice(1);
    } else {
      path = base + e.path;
    }
    path = path.replace(/\/\//g, "/");
    return {
      ...e,
      path,
    };
  });

  return routes;
}
export function transformRoute(route: FourzeRoute) {
  let { handle, method, path } = route;

  const regex = new RegExp(
    `^${path.replace(/(\:\w+)/g, "([a-zA-Z0-9-\\s]+)?")}([\?&#].*)?$`
  );

  const pathParams = path.match(/(\:\w+)/g) || [];
  return {
    regex,
    method,
    match(request: FourzeRequest, response: FourzeResponse) {
      if (!method || request.method?.toLowerCase() === method.toLowerCase()) {
        let url = request.url;

        const matches = url.match(regex);

        if (matches) {
          const params: Record<string, any> = {};
          for (let i = 0; i < pathParams.length; i++) {
            const key = pathParams[i].slice(1);
            const value = matches[i + 1];
            params[key] = value;
          }
          request.query = parseQuery(url);

          request.params = params;
          request.data = {
            ...request.body,
            ...request.query,
            ...request.params,
          };
          return handle(request, response);
        }
      }
      return FOURZE_NOT_MATCH;
    },
  };
}
