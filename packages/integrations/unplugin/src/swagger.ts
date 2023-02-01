import path from "path";
import type { FourzeHmrApp } from "@fourze/server";

import vite from "vite";
import fs from "fs-extra";
import { createApiDocs, getSwaggerFSPath, renderIndexHtml } from "@fourze/swagger";
import type { RequestMethod } from "@fourze/core";
import { resolves } from "@fourze/core";
import { defaultMockCode } from "./mock";

const swaggerAssetFiles = [
  "favicon-16x16.png",
  "favicon-32x32.png",
  "swagger-ui-bundle.js",
  "swagger-ui.css",
  "swagger-ui-standalone-preset.js"
];

export interface SwaggerUIBuildOptions {

  /**
   * @default "dist"
   */
  distPath?: string

  /**
   *  主项目的根路径
   *  @default "/"
   */
  base?: string

  assetsFilter?: (src: string) => boolean

  vite?: vite.InlineConfig

  /**
   * @default ".fourze-swagger"
   */
  tmpDir?: string

  defaultMethod?: RequestMethod

}

export async function build(app: FourzeHmrApp, options: SwaggerUIBuildOptions = {}) {
  const swaggerFsPath = getSwaggerFSPath();

  const distPath = options.distPath ?? path.join(process.cwd(), "dist");
  const tmpDir = path.join(process.cwd(), ".fourze-swagger");

  // 固定加上swagger-ui的路径
  const base = options.base ?? "/";

  const uiPath = "/swagger-ui/";

  const documentPath = "/swagger-ui/swagger.json";

  await fs.emptyDir(tmpDir);

  await fs.outputFile(path.join(tmpDir, "mock.ts"), defaultMockCode(app));

  await fs.outputFile(path.join(tmpDir, "index.html"), renderIndexHtml(resolves(base, uiPath), {
    url: resolves(base, documentPath),
    script: [
      {
        src: "mock.ts",
        type: "module"
      }
    ]
  }));

  const filter: fs.CopyFilterSync = options.assetsFilter ?? ((src) => {
    const filename = path.relative(swaggerFsPath, src);
    return filename === "" || swaggerAssetFiles.includes(filename);
  });
  await fs.copy(swaggerFsPath, path.join(tmpDir, "public"), { filter });

  // 打包接口文档 这里会有更好的方案吗???

  await vite.build(vite.mergeConfig(options.vite ?? {}, vite.defineConfig({
    base: resolves(base, uiPath),
    root: tmpDir,
    build: {
      outDir: path.join(distPath, uiPath),
      emptyOutDir: true,
      sourcemap: false,
      minify: true
    }
  })));
  await fs.outputFile(path.join(distPath, documentPath), JSON.stringify(createApiDocs(app, {
    defaultMethod: options.defaultMethod
  })));
  await fs.remove(tmpDir);
}
