import fourze from "@fourze/unplugin"
import vue from "@vitejs/plugin-vue"
import jsx from "@vitejs/plugin-vue-jsx"
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
    plugins: [
        vue(),
        jsx(),
        fourze.vite({
            base: "/api",
            dir: path.resolve(__dirname, "mock"),
            filePattern: [".ts$", ".js$"],
            hmr: true,
            logLevel: "info"
        })
    ]
})
