export const isNode = () => typeof window === "undefined"

export const isBrowser = () => !isNode()

export function slash(p: string): string {
    return p.replace(/\\/g, "/").replace(/\/+/g, "/")
}

export function joinPath(...paths: string[]) {
    return slash(paths.join("/"))
}
