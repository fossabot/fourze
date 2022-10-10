function isHeader(headers: unknown): headers is Headers {
    return (!!globalThis.Headers && headers instanceof globalThis.Headers) || headers instanceof PolyfillHeaders
}

export type PolyfillHeaderInit = Record<string, string | string[] | number | undefined> | string[][] | Headers

export class PolyfillHeaders {
    readonly #headers: Record<string, string> = {}
    constructor(init: PolyfillHeaderInit = {}) {
        this.#headers = flatHeaders(init)
    }

    append(name: string, value: string): void {
        appendHeader(this.#headers, name, value)
    }

    delete(name: string): void {
        delete this.#headers[name]
    }

    get(name: string): string | null {
        return this.#headers[name.toLowerCase()] ?? null
    }

    has(name: string): boolean {
        return name in this.#headers
    }

    set(name: string, value: string): void {
        this.#headers[name.toLowerCase()] = value
    }

    forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
        for (const key in this.#headers) {
            callbackfn(this.#headers[key], key, thisArg ?? this)
        }
    }

    [Symbol.iterator](): IterableIterator<[string, string]> {
        return Object.entries(this.#headers)[Symbol.iterator]()
    }

    entries(): IterableIterator<[string, string]> {
        return Object.entries(this.#headers)[Symbol.iterator]()
    }

    keys(): IterableIterator<string> {
        return Object.keys(this.#headers)[Symbol.iterator]()
    }

    values(): IterableIterator<string> {
        return Object.values(this.#headers)[Symbol.iterator]()
    }
}

function appendHeader(headers: Record<string, string>, key: string, value: string | string[] | number | undefined) {
    const oldValue = headers[key.toLowerCase()]

    const newValue = Array.isArray(value) ? value.join(", ") : String(value)

    headers[key.toLowerCase()] = oldValue ? `${oldValue}, ${newValue}` : newValue
}

export function flatHeaders(init: PolyfillHeaderInit = {}) {
    const headers: Record<string, string> = {}
    if (Array.isArray(init)) {
        for (const [key, value] of init) {
            appendHeader(headers, key, value)
        }
    } else if (isHeader(init)) {
        init.forEach((value, key) => {
            appendHeader(headers, key, value)
        })
    } else if (init) {
        for (const [key, value] of Object.entries(init)) {
            appendHeader(headers, key, value)
        }
    }
    return headers
}
