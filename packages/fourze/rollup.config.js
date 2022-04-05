import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "rollup";

const entry = ["src/index.ts", "src/vite.ts", "src/shared.ts"];

export default defineConfig(() => [
  {
    input: entry,
    external: ["esbuild"],

    output: {
      dir: "dist",
      entryFileNames: "[name].js",
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
      dir: "dist",
      entryFileNames: "[name].mjs",
      format: "esm",
    },
    plugins: [
      commonjs(),
      esbuild({
        target: "es6",
      }),
    ],
  },
  ...entry.map((e) => {
    return {
      input: e,
      output: {
        file: `${e.replace("src/", "dist/").replace(".ts", ".d.ts")}`,
        format: "esm",
      },
      plugins: [dts()],
    };
  }),
]);
