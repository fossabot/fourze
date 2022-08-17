import dayjs from "dayjs"
import { DateLike } from "../types"

export function randomInt(tmp: string): number

export function randomInt(max: number): number

export function randomInt(min: number, max: number): number

/**
 *
 * @param param0  min value
 * @param max  max value
 * @returns
 */
export function randomInt(param0: number | string, max?: number) {
    let min: number
    if (typeof param0 === "string") {
        const [minStr, maxStr] = param0.split("-")
        min = parseInt(minStr)
        max = parseInt(maxStr)
    } else {
        min = param0
    }
    if (max === undefined) {
        max = min
        min = 0
    }
    return Math.floor(Math.random() * (max - min)) + min
}

export function randomDate(start: DateLike): Date

export function randomDate(start: DateLike, end: DateLike): Date

export function randomDate(start: DateLike, end?: DateLike): Date {
    if (end === undefined) {
        end = start
        start = new Date()
    }
    const startDate = dayjs(start)
    const endDate = dayjs(end)
    return startDate.add(randomInt(endDate.diff(startDate, "day")), "day").toDate()
}

export function randomBoolean(): boolean {
    return Math.random() > 0.5
}

export function randomItem<T>(source: T[]): T {
    return source[randomInt(source.length)]
}

export function randomArray<T>(callback: (index: number) => T, minLength: number, maxLength: number): T[]

export function randomArray<T>(callback: (index: number) => T, maxLength: number): T[]

export function randomArray<T>(callback: (index: number) => T, minLength: number, maxLength?: number) {
    return Array.from(
        {
            length: randomInt(minLength, maxLength!)
        },
        (v, k) => callback(k)
    )
}
