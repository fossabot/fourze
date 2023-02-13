import type { MaybePromise } from "maybe-types";
import { createLogger } from "./logger";
import type { FourzeRouteMeta, MetaInstance } from "./shared/meta";
import { injectMeta } from "./shared/meta";
import type {
  FourzeApp, FourzeBaseRoute,
  FourzeHandle,
  FourzeMiddleware,
  FourzeNext,
  FourzeRequest,
  FourzeResponse,
  FourzeRoute,
  FourzeRouteGenerator,
  FourzeRouteOptions,
  FourzeRouterMeta,
  ObjectProps,
  PropType,
  RequestMethod
} from "./shared";
import {
  FOURZE_METHODS,
  defineMiddleware,
  defineRoute,
  isExtends
  ,
  isRoute
} from "./shared";
import {
  createSingletonPromise,
  isConstructor,
  isFunction,
  isObject,
  isString,
  isUndef,
  isUndefined,
  normalizeRoute,
  overload
} from "./utils";
import { createRouteMatcher } from "./shared/matcher";

const FourzeRouterSymbol = Symbol("FourzeRouter");

type FourzeRouteChain<Methods extends string = RequestMethod> = {
  [method in Methods]: {
    <Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta>(
      options: Omit<FourzeRouteOptions<Props, Meta>, "path" | "method">,
      handle: FourzeHandle<Result, Props, Meta>
    ): FourzeRouteChain<Exclude<Methods, method>>

    <Result = unknown, Props extends ObjectProps = ObjectProps, Meta = FourzeRouteMeta>(
      handle: FourzeHandle<Result, Props, Meta>
    ): FourzeRouteChain<Exclude<Methods, method>>
  }
};

export interface FourzeRouter
  extends FourzeMiddleware,
  FourzeRouteGenerator<FourzeRouter>, MetaInstance<FourzeRouter, FourzeRouterMeta> {

  reset(): void

  route(path: string): FourzeRouteChain

  route(path: string, method: RequestMethod, options: FourzeRouteOptions, handle: FourzeHandle): this

  route(path: string, method: RequestMethod, handle: FourzeHandle): this

  route(path: string, options: FourzeRouteOptions, handle: FourzeHandle): this

  route(path: string, handle: FourzeHandle): this

  route(route: FourzeBaseRoute): this

  route(route: FourzeBaseRoute[]): this

  setup(app?: FourzeApp): Promise<void>

  readonly meta: Record<string, any>

  readonly name: string

  readonly routes: FourzeRoute[]

  [FourzeRouterSymbol]: true
}

export type FourzeRouterSetup = (
  router: FourzeRouter,
  app: FourzeApp
) => MaybePromise<FourzeBaseRoute[] | FourzeRouterOptions | FourzeRouter | void>;

export interface FourzeRouterOptions {
  name?: string
  meta?: FourzeRouterMeta
  routes?: FourzeBaseRoute[]
  setup?: FourzeRouterSetup
}

export function defineRouter(): FourzeRouter;
export function defineRouter(options: FourzeRouterOptions): FourzeRouter;

export function defineRouter(modules: FourzeBaseRoute[]): FourzeRouter;

export function defineRouter(setup: FourzeRouterSetup): FourzeRouter;

export function defineRouter(
  params: FourzeBaseRoute[] | FourzeRouterOptions | FourzeRouterSetup = {}
): FourzeRouter {
  const isFunc = isFunction(params);
  const isArray = Array.isArray(params);
  const isOptions = !isFunc && !isArray;

  const options = isOptions ? params : {};

  const setup: FourzeRouterSetup | undefined = isOptions
    ? options.setup
    : isFunc
      ? params
      : () => params;

  const meta: Record<string, any> = { ...options.meta };

  const matcher = createRouteMatcher<FourzeRoute>();

  const logger = createLogger("@fourze/core");

  const router = defineMiddleware(options.name ?? `FourzeRouter@${Math.random().toString(32).slice(8)}`, async (
    request: FourzeRequest,
    response: FourzeResponse,
    next?: FourzeNext
  ) => {
    await router.setup();

    const { path, method } = request;

    const [route, matches] = matcher.match(path, (method as RequestMethod) ?? "all");

    logger.debug(`Request received -> ${normalizeRoute(request.path)}.`);

    if (route) {
      if (matches) {
        Object.assign(request.params, matches);
      }

      request.route = route;

      try {
        validateProps(route.props, request.data);
      } catch (error: any) {
        response.sendError(400, error.message);
        return;
      }

      request.meta = {
        ...request.meta,
        ...router.meta,
        ...route.meta
      };

      try {
        const _result = await route.handle(request, response);
        if (!isUndefined(_result)) {
          response.send(_result);
        }
      } catch (error: any) {
        response.sendError(500, error.message);
      }

      logger.debug(
        `Request matched -> ${normalizeRoute(request.path, method)}.`
      );

      if (!response.writableEnded) {
        response.end();
      }
    } else {
      logger.debug(`[${router.name}]`, `Request not matched -> ${normalizeRoute(request.path)}.`);
      await next?.();
    }

    return response.payload;
  }) as FourzeRouter;

  injectMeta(router, meta);

  const addRoute = (arg: FourzeBaseRoute) => {
    const route = isRoute(arg) ? arg : defineRoute(arg);
    matcher.add(route.path, route.method ?? "all", route);
  };

  router.route = function (this: FourzeRouter, ...args: any[]) {
    const firstArg = args[0];

    if (args.length === 1) {
      if (isString(firstArg)) {
        const path = firstArg;
        return FOURZE_METHODS.reduce((methods, method) => {
          methods[method] = function (
            this: FourzeRouter,
            ...args: [FourzeRouteOptions, FourzeHandle] | [FourzeHandle]
          ) {
            const { handle, options } = overload({
              options: {
                type: Object
              },
              handle: {
                type: Function as PropType<FourzeHandle>,
                required: true
              }
            }, args);

            addRoute({
              ...options,
              path,
              method,
              handle
            });
            return router;
          };
          return methods;
        }, {} as any);
      } else if (Array.isArray(firstArg)) {
        firstArg.forEach((r) => addRoute(r));
      } else {
        addRoute(firstArg);
      }
    } else {
      const baseRoute = overload({
        path: {
          type: String,
          required: true
        },
        method: {
          type: String as PropType<RequestMethod>
        },
        options: {
          type: Object
        },
        handle: {
          type: Function as PropType<FourzeHandle>,
          required: true
        }
      }, args);

      addRoute({
        ...baseRoute.options,
        path: baseRoute.path,
        method: baseRoute.method,
        handle: baseRoute.handle
      });
    }
    return this;
  };

  const setupRouter = createSingletonPromise(async (app: FourzeApp) => {
    try {
      const rs = await setup?.(router, app);
      if (rs) {
        if (Array.isArray(rs)) {
          rs.forEach((r) => addRoute(r));
        } else if (rs !== router && isObject(rs)) {
          options.name = rs.name ?? options.name;
          if (rs.meta) {
            Object.assign(meta, rs.meta);
          }
          if (rs.routes) {
            rs.routes.forEach((r) => addRoute(r));
          }
        }
      }
    } catch (error) {
      logger.error(error);
      throw error;
    }
  });

  return Object.defineProperties(router, {
    ...Object.fromEntries(
      [...FOURZE_METHODS].map((method) => [
        method,
        {
          get() {
            return function (
              this: FourzeRouter,
              path: string,
              ...others: any[]
            ) {
              const args = [path, method, ...others] as unknown as Parameters<
                typeof router["route"]
              >;
              router.route(...args);
              return this;
            };
          },
          enumerable: true
        }
      ])
    ),
    setup: {
      get() {
        return setupRouter;
      },
      enumerable: true
    },
    reset: {
      get() {
        return setupRouter.reset;
      },
      enumerable: true
    },
    routes: {
      get() {
        const routes: FourzeRoute[] = [];
        matcher.traverse((payload) => routes.push(payload));
        return routes;
      },
      enumerable: true
    },
    [FourzeRouterSymbol]: {
      value: true,
      enumerable: true,
      writable: false
    }
  });
}

export function isRouter(value: any): value is FourzeRouter {
  return !!value && !!value[FourzeRouterSymbol];
}

export function validateProps(
  props: ObjectProps,
  data: Record<string, unknown>
) {
  for (const [key, propsOption] of Object.entries(props)) {
    let value = data[key];
    if (propsOption != null) {
      if (isConstructor(propsOption) || Array.isArray(propsOption)) {
        //
      } else {
        const required = propsOption.required;
        if (isExtends(propsOption.type, Boolean)) {
          value = value ?? false;
        }
        if (required && isUndef(value)) {
          throw new Error(`Property '${key}' is required.`);
        }
      }
    }
  }
}
