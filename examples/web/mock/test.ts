import { defineRoutes } from "@fourze/core"
export default defineRoutes([
    {
        path: "/test",
        method: "get",
        handle: (req: any, res: any) => {
            res.end("write test.")
        }
    }
])
