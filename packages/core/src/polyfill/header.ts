function isHeader(headers: unknown): headers is Headers {
    return (!!globalThis.Headers && headers instanceof globalThis.Headers) || headers instanceof PolyfillHeaders
}

export type PolyfillHeaderInit = Record<string, string | string[] | number | undefined> | string[][] | Headers

export class PolyfillHeaders {
    #headers: Record<string, string> = {}
    constructor(init: PolyfillHeaderInit = {}) {
        if (Array.isArray(init)) {
            for (const [key, value] of init) {
                this.append(key, value)
            }
        } else if (isHeader(init)) {
            init.forEach((value, key) => {
                this.append(key, value)
            })
        } else if (init) {
            for (const key in init) {
                const values = init[key]
                const value = Array.isArray(values) ? values.join(", ") : values
                this.append(key, String(value))
            }
        }
    }

    append(name: string, value: string): void {
        this.#headers[name.toLowerCase()] = value
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

export function flatHeaders(init: PolyfillHeaderInit = {}) {
    const headers = new PolyfillHeaders(init)
    return Object.fromEntries(headers)
}
