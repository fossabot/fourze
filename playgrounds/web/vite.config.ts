import fourze, { mockJs } from "@fourze/vite"
import vue from "@vitejs/plugin-vue"
import jsx from "@vitejs/plugin-vue-jsx"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
    plugins: [
        vue(),
        jsx(),
        fourze({
            base: "/api",
            dir: path.resolve(__dirname, "mock"),
            filePattern: [".ts$", ".js$"],
            transformCode: mockJs,
            hmr: true,
            logLevel: "info"
        })
    ]
})
