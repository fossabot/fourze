import type { MaybeRegex } from "maybe-types"
import minimatch from "minimatch"
export function slash(p: string): string {
    return p.replace(/\\/g, "/").replace(/\/+/g, "/")
}

export const NOT_NEED_BASE = /^((https?|file):)\/\//i

export function relative(_path: string, _base?: string): string {
    if (isRelative(_path)) {
        if (!_path.startsWith("//") && _base) {
            return slash(_base + "/" + _path)
        }
        return slash(_path)
    }

    return _path
}

export function isRelative(path: string) {
    return !NOT_NEED_BASE.test(path)
}

export function isMatch(path: string, ...pattern: MaybeRegex[]) {
    return pattern.some(r => {
        if (r instanceof RegExp) {
            return r.test(path)
        }
        return path.startsWith(r) || minimatch(path, r, { partial: true })
    })
}
