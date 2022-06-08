import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { defineConfig } from "rollup"
import { dependencies, devDependencies } from "../../package.json"

const entry = ["index.ts"]

const external = Object.keys(dependencies ?? {}).concat(Object.keys(devDependencies ?? {}))

export default defineConfig(() => [
    {
        external,
        input: entry,
        output: {
            dir: "dist",
            entryFileNames: "main.js",
            format: "cjs"
        },
        plugins: [
            commonjs(),
            esbuild({
                target: "es6"
            })
        ]
    }
])
