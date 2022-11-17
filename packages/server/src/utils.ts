import os from "os";
import path from "path";
import { slash } from "@fourze/core";

/**
 *  copy from @vitejs/vite/packages/vite/src/node/utils.ts
 */

export const isWindows = os.platform() === "win32";

export function normalizePath(id: string) {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

export function defineEnvs(
  env: Record<string, any>,
  prefix = ""
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => {
      return [`${prefix}${key}`, JSON.stringify(value)];
    })
  );
}
