import fourze from "@fourze/vite"
import vue from "@vitejs/plugin-vue"
import jsx from "@vitejs/plugin-vue-jsx"
import { defineConfig } from "vite"
import windicss from "vite-plugin-windicss"

export default defineConfig({
    server: {
        port: 8000,
        host: "0.0.0.0"
    },
    plugins: [
        vue(),
        jsx(),
        windicss(),
        fourze({
            base: "/api",
            filePattern: [".ts$", ".js$"],
            hmr: true,
            delay: "200-500",
            logLevel: "info"
        })
    ]
})
