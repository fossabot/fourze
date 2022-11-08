import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
    entries: ["src/index"],
    clean: true,
    declaration: true,
    failOnWarn: false,
    externals: ["webpack"],
    rollup: {
        emitCJS: true,
        dts: {
            respectExternal: false
        }
    }
})
