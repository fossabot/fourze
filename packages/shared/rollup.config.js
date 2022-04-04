import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "rollup";

const entry = ["src/index.ts"];

export default defineConfig(() => [
  {
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
    input: ["src/index.ts"],
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
  },
]);
