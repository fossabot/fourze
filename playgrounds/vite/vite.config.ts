import { resolve } from "path";
import fourze from "@fourze/vite";
import vue from "@vitejs/plugin-vue";
import jsx from "@vitejs/plugin-vue-jsx";
import visualizer from "rollup-plugin-visualizer";
import uncomponents from "unplugin-vue-components";

import type { Plugin } from "vite";
import { defineConfig } from "vite";
import windicss from "vite-plugin-windicss";

export default defineConfig({
  base: "/test",
  server: {
    port: 8000,
    host: "0.0.0.0",
    fs: {
      strict: false
    }
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolve(__dirname, "./src")
      },
      {
        find: "assets",
        replacement: resolve(__dirname, "./src/assets")
      },
      {
        find: "vue",
        replacement: "vue/dist/vue.esm-bundler.js" // compile template
      }
    ],
    extensions: [".ts", ".js"]
  },
  envPrefix: ["APP_"],
  plugins: [
    vue(),
    jsx(),
    windicss(),
    fourze({
      base: "/api",
      filePattern: ["*.ts", "*.js"],
      hmr: true,
      mock: true,
      delay: "200-500",
      swagger: true,
      logLevel: "debug"
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    }) as Plugin,
    uncomponents.vite({
      resolvers: []
    })
  ]
});
