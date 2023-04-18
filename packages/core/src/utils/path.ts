import minimatch from "minimatch";
import type { MaybeRegex } from "maybe-types";
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

export function resolvePath(_path: string, ..._base: string[]): string {
  if (!hasProtocol(_path)) {
    if (!_path.startsWith("//")) {
      return resolves(..._base, _path);
    }
    return normalize(_path);
  }
  return _path;
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

/**
 * 格式化路径 必须以‘/’开始，结尾去除'/',不得有重复的'/'
 * @example /abc/edf
 * @param paths
 * @returns
 */
export function resolves(...args: (string | undefined)[]): string {
  const paths = args.filter((p) => !!p && p !== "/") as string[];
  if (paths.length) {
    return normalize(paths.map(normalize).join(""));
  }
  return "/";
}

