import { FourzeError } from "./error";
import type { RequestMethod } from "./request";

interface RouteMatcher<T = any> {

  add(path: string, method: RequestMethod | "all", payload: T): this

  match(path: string, method: RequestMethod | "all"): [T | null, Record<string, string> | null]

  remove(path: string, method?: RequestMethod): boolean

  traverse(callback: (payload: T, path: string, method: RequestMethod | "all") => void): void
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
} as const;

type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

export interface RouteNode<T = any> {
  type: NodeType
  children: Map<string, RouteNode<T>>
  parent: RouteNode<T> | null
  wildcardChildNode: RouteNode<T> | null
  placeholderChildNode: RouteNode<T> | null
  paramName: string | null
  payload: Map<RequestMethod | "all", T>
}

function createRouteNode<T>(options: Partial<RouteNode<T>> = {}): RouteNode<T> {
  return {
    type: options.type ?? NODE_TYPES.NORMAL,
    children: options.children ?? new Map(),
    parent: options.parent ?? null,
    paramName: options.paramName ?? null,
    wildcardChildNode: null,
    placeholderChildNode: null,
    payload: new Map()
  };
}

export interface RouteMatcherOptions {
  caseSensitive?: boolean
  strictTrailingSlash?: boolean
  notAllowedRaiseError?: boolean
}

/**
 * Based on original work of unjs/radix3 by Pooya Parsa <pooya@pi0.io> (MIT)
 *  @see https://github.com/unjs/radix3
 */
export function createRouteMatcher<T>(options: RouteMatcherOptions = {}): RouteMatcher<T> {
  const rootNode = createRouteNode<T>();
  const staticRoutes = new Map<string, RouteNode>();

  const normalizePath = (path: string) => {
    if (!options.strictTrailingSlash) {
      path = path.replace(/\/$/, "") || "/";
    }
    if (!options.caseSensitive) {
      path = path.toLowerCase();
    }
    return path;
  };

  return {
    add(path: string, method: RequestMethod | "all", payload: any) {
      method = method.toLowerCase() as RequestMethod;
      path = normalizePath(path);
      const segments = path.split("/");

      let currentNode = rootNode;
      let _unnamedPlaceholderCtr = 0;
      let isStaticRoute = true;

      for (const segment of segments) {
        let childNode = currentNode.children.get(segment);

        if (!childNode) {
          const type = getNodeType(segment);
          childNode = createRouteNode({
            type,
            parent: currentNode
          });
          currentNode.children.set(segment, childNode);
          if (type === NODE_TYPES.PLACEHOLDER) {
            const firstChar = segment[0];
            if (firstChar === "*") {
              childNode.paramName = `_${_unnamedPlaceholderCtr++}`;
            } else if (firstChar === ":") {
              childNode.paramName = segment.slice(1);
            } else {
              childNode.paramName = segment.slice(1, -1);
            }
            currentNode.placeholderChildNode = childNode;
            isStaticRoute = false;
          } else if (type === NODE_TYPES.WILDCARD) {
            currentNode.wildcardChildNode = childNode;
            isStaticRoute = false;
          }
        }
        currentNode = childNode;
      }

      currentNode.payload.set(method, payload);

      if (isStaticRoute) {
        staticRoutes.set(path, currentNode);
      }
      return this;
    },
    match(path: string, method: RequestMethod | "all" = "all") {
      method = method.toLowerCase() as RequestMethod;
      path = normalizePath(path);

      const staticRoute = staticRoutes.get(path);
      if (staticRoute) {
        const payload = staticRoute.payload.get(method) ?? staticRoute.payload.get("all");
        if (payload) {
          return [payload, null];
        }
      }
      let currentNode: RouteNode | null = rootNode;

      let wildcardNode: RouteNode | null = null;

      let wildcardParam: string | null = null;

      let paramsFound = false;

      const params: Record<string, string> = {};

      const segments = path.split("/");

      for (let i = 0; i < segments.length; i++) {
        if (currentNode.type === NODE_TYPES.WILDCARD) {
          wildcardNode = currentNode;
          wildcardParam = segments.slice(i).join("/");
        }
        const nextNode = currentNode.children.get(segments[i]);
        if (nextNode) {
          currentNode = nextNode;
        } else {
          currentNode = currentNode.placeholderChildNode;
          if (currentNode) {
            params[currentNode.paramName!] = segments[i];
            paramsFound = true;
          } else {
            break;
          }
        }
      }

      if ((currentNode == null || !currentNode.payload.has(method)) && wildcardNode) {
        currentNode = wildcardNode;
        if (wildcardParam) {
          params[currentNode.paramName ?? "_"] = wildcardParam;
        }
      }

      if (!currentNode) {
        return [null, null];
      }

      const data = currentNode.payload.get(method) ?? currentNode.payload.get("all");
      if (data) {
        return [data, paramsFound ? params : null];
      }
      if (currentNode.payload.size > 0 && options.notAllowedRaiseError) {
        throw new FourzeError(405, "Method Not Allowed");
      }
      return [null, null];
    },
    remove(path: string, method: RequestMethod | "all" = "all") {
      method = method.toLowerCase() as RequestMethod;
      path = normalizePath(path);

      let success = false;
      const sections = path.split("/");
      let node: RouteNode | null | undefined = rootNode;

      for (const section of sections) {
        node = node.children.get(section);
        if (!node) {
          return success;
        }
      }

      const data = node.payload.get(method);

      if (data) {
        const lastSection = sections[sections.length - 1];
        node.payload.delete(method);
        if (Object.keys(node.children).length === 0) {
          const parentNode = node.parent!;
          parentNode.children.delete(lastSection);
          parentNode.wildcardChildNode = null;
          parentNode.placeholderChildNode = null;
        }
        success = true;
      }
      return success;
    },
    traverse(callback) {
      const fn = (node: RouteNode<T>, path: string) => {
        for (const [key, childNode] of node.children) {
          fn(childNode, `${path}/${key}`);
        }
        for (const [method, payload] of node.payload) {
          callback(payload, path, method);
        }
      };
      fn(rootNode, "");
    }
  };
}

const PARAM_KEY_REGEX = /^\{.*\}$/;

function getNodeType(path: string) {
  if (path.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (PARAM_KEY_REGEX.test(path) || path.startsWith("*") || path.startsWith(":")) {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}
