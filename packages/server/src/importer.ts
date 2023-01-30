import path from "path";
import fs from "fs-extra";
import { interopDefault } from "mlly";
export interface ModuleImporterOptions {
  external?: string[]
  define?: Record<string, string>
  interopDefault?: boolean
  cache?: boolean
}

export type ModuleImporter = (id: string) => Promise<any>;

export function createImporter(options: ModuleImporterOptions): ModuleImporter {
  const cacheDir = path.join(process.cwd(), "node_modules", ".cache", "fourze/");
  return async function (id: string) {
    await fs.mkdirs(cacheDir);
    const outfile = path.join(cacheDir, `${path.basename(id)}.js`);
    try {
      const { build } = await import("esbuild");
      await build({
        entryPoints: [id],
        external: options.external ?? [],
        outfile,
        write: true,
        platform: "node",
        bundle: true,
        metafile: false,
        allowOverwrite: true,
        format: "cjs",
        target: "es6",
        define: options.define ?? {},
        alias: {},
        treeShaking: true
      });
      if (!options.cache) {
        delete require.cache[outfile];
      }
      const rs = require(outfile);
      if (options.interopDefault) {
        return interopDefault(rs);
      }
      return rs;
    } finally {
      if (!options.cache) {
        await fs.remove(outfile);
      }
    }
  };
}
