import { defineBuildConfig } from "unbuild"
import { devDependencies } from "./package.json"

const externals = [...Object.keys(devDependencies ?? {}), "vite", "unplugin", "esbuild", "rollup", "unbuild"]

export default defineBuildConfig({
    entries: ["src/*"],
    outDir: "dist",
    clean: true,
    declaration: true,
    devDependencies: Object.keys(devDependencies ?? {}),
    externals,
    rollup: {
        emitCJS: true,
        dts: {
            respectExternal: false
        }
    }
})
