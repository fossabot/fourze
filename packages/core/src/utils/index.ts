import { Pagination, PagingData } from "../types"

export function slicePage<T>(source: T[], pagination: Pagination): PagingData<T> {
    const { page = 1, size = 10 } = pagination
    const total = source.length
    const data = source.slice((page - 1) * size, page * size)
    return {
        total,
        page,
        size,
        data
    }
}

type OverloadConfig<T = object> = {
    name: keyof T
    required?: boolean
    type: "string" | "number" | "boolean" | "array" | "object" | "function"
    default?: any
    transform?: (value: T[keyof T]) => any
    match?: (value: T[keyof T]) => boolean
}[]

export function overload<T>(config: OverloadConfig<T>, args: any[]) {
    const result = {} as T

    for (const { name, required = false, type, default: defaultValue, match, transform } of config) {
        function matchValue(value: any) {
            if (match) {
                return match(value)
            }
            if (value == undefined) {
                return !required
            }
            if (type == "array") {
                return Array.isArray(value)
            }
            return typeof value == type
        }

        const value = args.shift()

        if (matchValue(value)) {
            result[name] = transform ? transform(value) : value
            continue
        } else {
            result[name] = defaultValue
        }

        args.unshift(value)
    }
    return result
}

export * from "./delay"
export * from "./random"
