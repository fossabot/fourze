import type { IncomingMessage } from "http";
import qs from "query-string";
import type { PolyfillHeaderInit } from "../polyfill";
import { decodeFormData, flatHeaders, getHeaderValue } from "../polyfill";
import { isString, isUint8Array, normalize } from "../utils";
import type { DefaultData, ExtractPropTypes, ExtractPropTypesWithIn, ObjectProps } from "./props";
import { validateProps, withDefaults } from "./props";
import type { FourzeRoute } from "./route";
import type { FourzeRouteMeta } from "./meta";
import type { FourzeApp } from ".";

const FOURZE_REQUEST_SYMBOL = Symbol("FourzeRequest");

export const FOURZE_METHODS = [
  "get",
  "post",
  "delete",
  "put",
  "patch",
  "options",
  "head",
  "trace",
  "connect"
] as const;

export type RequestMethod = typeof FOURZE_METHODS[number];

export interface FourzeRequestOptions {
  url: string
  method?: string
  headers?: PolyfillHeaderInit
  body?: any
  params?: Record<string, any>
  request?: IncomingMessage
}

export interface FourzeRequest<
  Props extends ObjectProps = DefaultData, Meta = FourzeRouteMeta, Data = ExtractPropTypes<Props>, Query = ExtractPropTypesWithIn<Props, "query">, Body = ExtractPropTypesWithIn<Props, "body">, Params = ExtractPropTypesWithIn<Props, "path">
> extends IncomingMessage {
  url: string
  method: string
  headers: Record<string, string | string[] | undefined>

  route: FourzeRoute

  app?: FourzeApp

  meta: Meta & FourzeRouteMeta

  contextPath: string

  setRoute(route: FourzeRoute, matchParams?: Record<string, any> | null): void

  readonly req?: IncomingMessage

  readonly originalPath: string

  readonly params: Params

  readonly query: Query

  readonly body: Body
  /**
   *  {...query, ...params, ...body}
   */
  readonly data: Data

  readonly raw: string

  readonly path: string

  readonly [FOURZE_REQUEST_SYMBOL]: true
}

export function createRequest(options: FourzeRequestOptions) {
  const request = ({
    url: options.url ?? options.request?.url,
    method: options.method ?? options.request?.method
  }) as FourzeRequest;

  request.url = options.url ?? request.url;
  request.method = request.method ?? "GET";

  request.meta = {};

  const headers = {
    ...flatHeaders(request.headers),
    ...flatHeaders(options.headers)
  };

  request.headers = headers;

  const { query = {}, url: originalPath } = qs.parseUrl(request.url, {
    parseBooleans: true
  });

  const contentType = getHeaderValue(
    headers,
    "Content-Type",
    "application/json"
  );

  const bodyRaw: Buffer | string | Record<string, any>
      = options.body ?? request.body ?? {};
  let body: Record<string, any> = {};
  if (isUint8Array(bodyRaw) || isString(bodyRaw)) {
    if (bodyRaw.length > 0) {
      if (contentType.startsWith("application/json")) {
        body = JSON.parse(bodyRaw.toString("utf-8"));
      } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
        body = qs.parse(bodyRaw.toString("utf-8"));
      }

      if (contentType.startsWith("multipart/form-data")) {
        const boundary = contentType.split("=")[1];
        body = decodeFormData(bodyRaw, boundary);
      }
    }
  } else {
    body = { ...bodyRaw };
  }

  body = body ?? {};

  const params = { ...options.params };

  let _contextPath = "/";

  let _route: FourzeRoute | undefined;

  /**
   *  默认值
   */
  const _defaultsProps = {};

  request.setRoute = (route, matches) => {
    _route = route;
    if (matches) {
      Object.assign(params, matches);
    }
    withDefaults(params, route.props, "path");
    withDefaults(query, route.props, "query");
    withDefaults(body, route.props, "body");
    const data = withDefaults(request.data, route.props);
    Object.assign(_defaultsProps, data);
    validateProps(route.props, data);
  };

  Object.defineProperties(request, {
    [FOURZE_REQUEST_SYMBOL]: {
      get() {
        return true;
      },
      enumerable: true
    },
    req: {
      get() {
        return options.request;
      }
    },
    data: {
      get() {
        return {
          ..._defaultsProps,
          ...query,
          ...body,
          ...params
        };
      },
      enumerable: true
    },
    body: {
      get() {
        return body;
      },
      enumerable: true
    },
    bodyRaw: {
      get() {
        return bodyRaw;
      },
      enumerable: true
    },
    params: {
      get() {
        return params;
      },
      enumerable: true
    },
    query: {
      get() {
        return query;
      },
      enumerable: true
    },
    route: {
      get() {
        return _route;
      },
      enumerable: true
    },
    contextPath: {
      get() {
        return _contextPath ?? "/";
      },
      set(val) {
        _contextPath = val;
      },
      enumerable: true
    },
    path: {
      get() {
        return normalize(originalPath.replace(new RegExp(`^${_contextPath}`), ""));
      },
      enumerable: true
    },
    originalPath: {
      get() {
        return originalPath;
      },
      enumerable: true
    }
  });

  return request;
}

export function isFourzeRequest(obj: any): obj is FourzeRequest {
  return !!obj && !!obj[FOURZE_REQUEST_SYMBOL];
}
