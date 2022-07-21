import { builtinModules } from "module"
import { defineConfig } from "vite"
import pkg from "./package.json"

export default defineConfig({
    root: __dirname,
    build: {
        lib: {
            entry: "index.ts",
            formats: ["cjs"],
            fileName: () => "main.js"
        },
        watch: {
            exclude: ["public/"]
        },
        minify: process.env./* from mode option */ NODE_ENV === "production",
        sourcemap: process.env./* from mode option */ NODE_ENV == "development",
        rollupOptions: {
            external: ["electron", ...builtinModules, ...Object.keys(pkg.devDependencies || {})]
        }
    }
})
