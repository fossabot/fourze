import { defineConfig } from "vite"
import fourze, { mockJs } from "@fourze/vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    plugins: [
        react(),
        fourze({
            dir: path.resolve(__dirname, "mock"),
            base: "http://test.com",
            filePattern: [".ts$", ".js$"],
            proxy: {
                "//stat": path.resolve(__dirname, "static")
            },
            transformCode: mockJs,
            mock: false,
            hmr: true,
            logLevel: "info"
        })
    ]
})
