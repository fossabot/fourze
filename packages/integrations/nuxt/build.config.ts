import { defineBuildConfig } from "unbuild";
import { devDependencies, dependencies } from "./package.json";

const externals = [
    ...Object.keys(devDependencies ?? {}),
    ...Object.keys(dependencies ?? {}),
];

export default defineBuildConfig({
    clean: true,
    declaration: true,
    failOnWarn: false,
    externals,
    rollup: {
        emitCJS: true,
        dts: {
            respectExternal: false,
        },
    },
});
