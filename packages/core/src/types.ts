export type MaybePromise<T = any> = Promise<T> | T

export type MaybeFn<T> = (() => T) | T
export interface Pagination {
    page?: number
    size?: number
}

export interface PagingData<T> {
    total: number
    page: number
    size: number
    data: T[]
}

export type DateLike = string | Date | number
