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

export * from "./faker"
export * from "./overload"
export * from "./promise"
export * from "./random"
