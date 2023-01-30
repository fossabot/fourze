import path from "path";
import type { FourzeHmrApp } from "@fourze/server";

import vite from "vite";
import fs from "fs-extra";
import { createApiDocs, generateHtmlString, getSwaggerFSPath } from "@fourze/swagger";
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
   *  @default "/swagger-ui/"
   */
  uiPath?: string

  /**
   *  @default "swagger.json"
   */
  documentUrl?: string

  assetsFilter?: (src: string) => boolean
  mock?: boolean
  vite?: vite.InlineConfig

  root?: string
}

export async function build(app: FourzeHmrApp, options: SwaggerUIBuildOptions = {}) {
  const swaggerFsPath = getSwaggerFSPath();
  const distPath = options.distPath ?? path.join(process.cwd(), "dist", "swagger-ui");
  const documentUrl = options.documentUrl ?? "./swagger.json";

  const tmpDir = path.join(process.cwd(), ".fourze-swagger");

  await fs.emptyDir(tmpDir);

  if (options.mock) {
    const hmrApp = app as FourzeHmrApp;
    const code = defaultMockCode(hmrApp);
    await fs.outputFile(path.join(tmpDir, "mock.ts"), code);
  }

  await fs.outputFile(path.join(tmpDir, "index.html"), generateHtmlString(
    {
      initOptions: {
        url: documentUrl
      },
      externalScripts: [
        {
          src: "./mock.ts",
          type: "module"
        }
      ]
    }
  ));

  const filter: fs.CopyFilterSync = options.assetsFilter ?? ((src) => {
    const filename = path.relative(swaggerFsPath, src);
    return filename === "" || swaggerAssetFiles.includes(filename);
  });
  await fs.copy(swaggerFsPath, path.join(tmpDir, "public"), { filter });

  // 打包接口文档 这里会有更好的方案吗???

  await vite.build(vite.mergeConfig(options.vite ?? {}, vite.defineConfig({
    base: "./",
    root: tmpDir,
    build: {
      outDir: distPath,
      emptyOutDir: true,
      sourcemap: true
    },
    esbuild: {

    }
  })));
  await fs.outputFile(path.resolve(distPath, documentUrl), JSON.stringify(createApiDocs(app)));
  await fs.remove(tmpDir);
}
