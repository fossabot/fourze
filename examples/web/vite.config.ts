import { defineConfig } from "vite"
import fourze, { mockJs } from "@fourze/vite"
import vue from "@vitejs/plugin-vue"
import jsx from "@vitejs/plugin-vue-jsx"
import path from "path"

export default defineConfig({
    plugins: [
        vue(),
        jsx(),
        fourze({
            dir: path.resolve(__dirname, "mock"),
            filePattern: [".ts$", ".js$"],
            transformCode: mockJs,
            mock: false,
            hmr: true,
            logLevel: "info"
        })
    ]
})
