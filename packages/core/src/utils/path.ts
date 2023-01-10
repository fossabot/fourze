import type { MaybeRegex } from "maybe-types";
import minimatch from "minimatch";
import { isRegExp } from "./is";

export function slash(...paths: string[]): string {
  return paths
    .map((p) => p.replace(/\\/g, "/"))
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

export function resolvePath(_path: string, _base?: string): string {
  if (!hasProtocol(_path)) {
    if (!_path.startsWith("//") && _base) {
      return slash(_base, _path);
    }
    return slash(_path);
  }
  return _path;
}

export function relativePath(path: string, base?: string): string {
  if (!hasProtocol(path)) {
    if (base) {
      path = path.replace(new RegExp(`^${slash(base)}`), "/");
    }
    return slash(path);
  }
  return path;
}

export function hasProtocol(path: string) {
  return /^\w+:\/\//i.test(path);
}

export function isMatch(path: string, ...pattern: MaybeRegex[]) {
  return pattern.some((r) => {
    if (isRegExp(r)) {
      return r.test(path);
    }
    return path.startsWith(r) || minimatch(path, r, { partial: true });
  });
}
