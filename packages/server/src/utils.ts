import { slash } from "@fourze/core"
import os from "os"
import path from "path"

/**
 *  copy from @vitejs/vite/packages/vite/src/node/utils.ts
 */

export const isWindows = os.platform() === "win32"

export function normalizePath(id: string) {
    return path.posix.normalize(isWindows ? slash(id) : id)
}
