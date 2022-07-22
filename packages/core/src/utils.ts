import dayjs from "dayjs"

export interface Pagination {
    page?: number
    size?: number
}

export interface PaginationResult<T> {
    total: number
    page: number
    size: number
    data: T[]
}

export type DateLike = string | Date | number

export function slicePage<T>(source: T[], pagination: Pagination): PaginationResult<T> {
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

export function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export function randomInt(max: number): number

export function randomInt(min: number, max: number): number

export function randomInt(min: number, max?: number) {
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

export const logger = {
    level: "info",
    info(...args: any[]) {
        if (this.level === "info") {
            console.info(`[Fourze INFO ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    error(...args: any[]) {
        if (this.level === "error") {
            console.error(`[Fourze ERROR ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    }
}
