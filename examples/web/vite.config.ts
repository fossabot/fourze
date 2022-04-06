import { defineConfig } from "vite";
import VitePluginFourze from "@fourze/vite";
import VitePluginJsx from "@vitejs/plugin-vue-jsx";
import path from "path";

export default defineConfig({
  plugins: [
    VitePluginJsx(),
    VitePluginFourze({
      dir: path.resolve(__dirname, "mock"),
      base: "/api",
      filePattern: [".ts$", ".js$"],
      mock: true,
      hmr: true,
      logLevel: "info",
    }),
  ],
});
