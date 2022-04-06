import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "rollup";
import { dependencies, devDependencies } from "../../package.json";

const external = Object.keys(dependencies ?? {}).concat(
  Object.keys(devDependencies ?? {})
);

const entry = ["src/index.ts"];

export default defineConfig(() => [
  {
    external,
    input: entry,
    output: {
      file: "dist/index.js",
      format: "cjs",
    },
    plugins: [
      commonjs(),
      esbuild({
        target: "es6",
      }),
    ],
  },
  {
    external,
    input: entry,
    output: {
      file: "dist/index.mjs",
      format: "esm",
    },
    plugins: [
      commonjs(),
      esbuild({
        target: "es6",
      }),
    ],
  },
  {
    external,
    input: entry,
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
  },
]);
