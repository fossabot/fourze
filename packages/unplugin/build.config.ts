import { defineBuildConfig } from "unbuild"
import { devDependencies as rootDevDependencies } from "../../package.json"
import { devDependencies } from "./package.json"

const externals = [...Object.keys(devDependencies ?? {}), ...Object.keys(rootDevDependencies ?? {})]

export default defineBuildConfig({
    entries: ["src/index"],
    clean: true,
    declaration: true,
    failOnWarn: false,
    externals,
    rollup: {
        emitCJS: true,
        dts: {
            respectExternal: false
        }
    }
})
