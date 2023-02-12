import { resolves } from "../utils";
import type { ObjectProps } from "./props";
import type { RequestMethod } from "./request";
import { FOURZE_METHODS } from "./request";
import type { FourzeRouteMeta } from "./meta";
import type { FourzeHandle } from ".";

const FOURZE_ROUTE_SYMBOL = Symbol("FourzeRoute");

export interface FourzeRouteOptions<Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta> {
  method?: RequestMethod
  props?: Props
  meta?: Meta & FourzeRouteMeta
}

export interface FourzeBaseRoute<
  Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
> {
  path: string
  method?: RequestMethod
  handle: FourzeHandle<Result, Props, Meta>
  meta?: Meta
  props?: Props
}

export interface FourzeRoute<
  Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
> extends FourzeBaseRoute<Result, Props, Meta> {
  readonly [FOURZE_ROUTE_SYMBOL]: true
  readonly pathParams: RegExpMatchArray | string[]
  readonly props: Props
  readonly meta: Meta
  match: (
    url: string,
    method?: string,
    base?: string
  ) => RegExpMatchArray | null
}

export interface FourzeRouteFunction<This> {

  <
    Method extends RequestMethod, Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
  >(
    path: string,
    method: Method,
    options: FourzeRouteOptions<Props, Meta>,
    handle: FourzeHandle<Result, Props, Meta>
  ): This

  <
    Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
  >(
    path: string,
    options: FourzeRouteOptions<Props, Meta>,
    handle: FourzeHandle<Result, Props, Meta>
  ): This

  <Method extends RequestMethod, Result = unknown>(
    path: string,
    method: Method,
    handle: FourzeHandle<Result>
  ): This

  <Result = unknown>(path: string, handle: FourzeHandle<Result>): This

  <
    Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
  >(
    route: FourzeBaseRoute<Result, Props, Meta>
  ): This
}

export type FourzeRouteGenerator<This> = {
  [K in RequestMethod]: {
    <
      Result = any, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
    >(
      path: string,
      options: FourzeRouteOptions<Props, Meta>,
      handle: FourzeHandle<Result, Props, Meta>
    ): This
    <Result>(path: string, handle: FourzeHandle<Result>): This
  };
};

export function isRoute(route: any): route is FourzeRoute<unknown> {
  return !!route && !!route[FOURZE_ROUTE_SYMBOL];
}

const REQUEST_PATH_REGEX = new RegExp(
  `^(${FOURZE_METHODS.join("|")})\\s+`,
  "i"
);

const PARAM_KEY_REGEX = /\{[\w_-]+\}/g;

export function defineRouteProps<Props extends ObjectProps = ObjectProps>(
  props: Props
) {
  return props;
}

export function defineRoute<
  Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta
>(
  route: FourzeBaseRoute<Result, Props, Meta> & { base?: string }
): FourzeRoute<Result, Props, Meta> {
  const { handle, meta = {} as Meta, props = {} as Props, base } = route;
  let { method, path } = route;

  if (REQUEST_PATH_REGEX.test(path)) {
    const arr = path.split(/\s+/);
    const m = arr[0].toLowerCase() as RequestMethod;
    if (FOURZE_METHODS.includes(m)) {
      method = m;
      path = arr[1].trim();
    }
  }

  path = resolves(base, path);

  return {
    method,
    path,
    meta,
    handle,
    match(this: FourzeRoute, url: string, method?: string) {
      if (
        !this.method
        || !method
        || this.method.toLowerCase() === method.toLowerCase()
      ) {
        let pattern = path.replace(PARAM_KEY_REGEX, "([a-zA-Z0-9_-\\s]+)?");
        if (!pattern.startsWith("*")) {
          pattern = `^${pattern}`;
        }
        if (!pattern.endsWith("*")) {
          pattern = `${pattern}$`;
        }
        const regex = new RegExp(pattern, "i");
        return url.match(regex);
      }
      return null;
    },
    get pathParams() {
      return this.path.match(PARAM_KEY_REGEX) ?? [];
    },
    get props() {
      return props;
    },
    get [FOURZE_ROUTE_SYMBOL](): true {
      return true;
    }
  };
}

