import { isBrowser } from "./common"

export function parseFormdata(data: any) {
    if (isBrowser()) {
        if (data instanceof FormData) {
            const rs: Record<string, any> = {}
            data.forEach((v, k) => {
                rs[k] = v
            })
            return data
        }
        return data
    }
    const content = String(data)
    const lines = content.split("\r\n")
    console.log(lines)
    return {}
}
