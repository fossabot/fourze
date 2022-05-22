import { defineRoute, defineRoutes, FourzeRouteSymbol } from "@fourze/core"
export default [
    {
        path: "/test",
        method: "get",
        handle: (req: any, res: any) => {
            res.end("write test.")
        },
        [FourzeRouteSymbol]: true
    }
]
