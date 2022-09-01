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
