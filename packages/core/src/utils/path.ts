import minimatch from "minimatch";
import type { MaybeRegex } from "maybe-types";
import { resolveURL } from "ufo";
import { isRegExp } from "./is";

export function slash(...paths: string[]): string {
  let path = paths
    .map((p) => p.replace(/\\/g, "/"))
    .join("/")
    .replace(/\/+/g, "/");

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  if (!path.startsWith("/")) {
    path = "/".concat(path);
  }

  return path;
}

export function relativePath(path: string, base?: string): string | null {
  if (!hasProtocol(path)) {
    if (base) {
      if (base.endsWith("/")) {
        base = base.slice(0, -1);
      }
      if (path.startsWith(base)) {
        path = path.slice(base.length);
      } else {
        return null;
      }
    }
    return path;
  }
  return null;
}

const protocolReg = /^(\w+):\/\//i;

export function hasProtocol(path: string) {
  return protocolReg.test(path);
}

export function isMatch(path: string, ...pattern: MaybeRegex[]) {
  return pattern.some((r) => {
    if (isRegExp(r)) {
      return r.test(path);
    }
    return path.startsWith(r) || minimatch(path, r, { matchBase: true, partial: true });
  });
}

/**
 * 格式化路径
 * @param path
 */
export function normalize(path: string) {
  if (!path.startsWith("/")) {
    path = "/".concat(path);
  }
  path = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
}

export function resolves(...paths: string[]) {
  if (paths.length === 0) {
    return "/";
  }
  return resolveURL(paths[0], ...paths.slice(1));
}
