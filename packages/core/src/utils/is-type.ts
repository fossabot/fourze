export function isString(value: unknown): value is string {
    return typeof value === "string" || value instanceof String
}

export function isNumber(value: unknown): value is number {
    return typeof value === "number" || value instanceof Number
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean" || value instanceof Boolean
}

export function isFunction(value: unknown): value is Function {
    return typeof value === "function" || value instanceof Function
}

export function isBuffer(value: unknown): value is Buffer {
    return value != null && typeof value === "object" && "length" in value
}

export function isURL(value: unknown): value is URL {
    return globalThis.URL && value instanceof URL
}

export function isUndefined(value: unknown): value is undefined {
    return typeof value === "undefined"
}

export function isNull(value: unknown): value is null {
    return isUndefined(value) || value === null
}

export function isFalsy(value: unknown): value is false {
    return !value
}
