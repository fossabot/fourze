import type { FSWatcher } from "chokidar";
import { FourzeRoute } from "@fourze/shared";
import chokidar from "chokidar";
import { build } from "esbuild";
import fs from "fs";
import path from "path";

export interface FourzeRouterOptions {
  base?: string;
  dir?: string;
  watcher?: FSWatcher;
  pattern?: (string | RegExp)[];
  moduleNames?: string[];
}

export interface FourzeRouter {
  load(): void | Promise<void>;
  load(moduleName: string): void | Promise<void>;
  remove(moduleName: string): void | Promise<void>;
  watch(watcher?: FSWatcher): void;
  watch(dir?: string, watcher?: FSWatcher): void;
  routes: FourzeRoute[];
  moduleNames: string[];
  base: string;
}

const TEMPORARY_FILE_SUFFIX = ".tmp.js";

function transformPattern(pattern: (string | RegExp)[]) {
  return pattern.map((p) => {
    if (typeof p === "string") {
      return new RegExp(p);
    }
    return p;
  });
}

export function createRouter(options: FourzeRouterOptions): FourzeRouter {
  const base = options.base ?? "/";
  const rootDir = path.resolve(process.cwd(), options.dir ?? "./routes");
  const pattern = transformPattern(options.pattern ?? [".ts", ".js"]);
  const moduleNames: string[] = options.moduleNames ?? [];

  const load = async (moduleName: string = rootDir) => {
    const stat = await fs.promises.stat(moduleName);
    if (stat.isDirectory()) {
      const files = await fs.promises.readdir(moduleName);
      for (let name of files) {
        load(path.join(moduleName, name));
      }
    } else if (stat.isFile()) {
      if (!pattern.some((e) => e.test(moduleName))) {
        return;
      }
      await loadMockModule(moduleName);
    }
  };

  const loadMockModule = async (moduleName: string) => {
    console.log("loadMockModule", moduleName);
    if (moduleName.endsWith(".ts")) {
      await loadTsMockModule(moduleName);
    } else {
      await loadJsMockModule(moduleName);
    }
  };

  const loadJsMockModule = async (moduleName: string) => {
    await remove(moduleName);
    require(moduleName);
    moduleNames.push(moduleName);
  };

  const loadTsMockModule = async (moduleName: string) => {
    const modName = moduleName.replace(".ts", TEMPORARY_FILE_SUFFIX);

    await build({
      entryPoints: [moduleName],
      outfile: modName,
      write: true,
      platform: "node",
      bundle: true,
      format: "cjs",
      metafile: true,
      target: "es6",
    });

    await loadJsMockModule(modName);
    fs.unlink(modName, (err) => {
      if (err) {
        console.error("delete file " + modName + " error", err);
      }
    });
  };

  const remove = async (moduleName: string) => {
    console.log("delete module cache", moduleName);
    delete require.cache[moduleName];
    for (const [i, modName] of moduleNames.entries()) {
      if (modName === moduleName) {
        moduleNames.splice(i, 1);
      }
    }
  };

  function watch(dir?: string | FSWatcher, customWatcher?: FSWatcher) {
    let watchDir: string;
    let watcher: FSWatcher;
    if (typeof dir === "string") {
      watchDir = dir;
      watcher = customWatcher ?? chokidar.watch(dir);
    } else {
      watchDir = rootDir;
      watcher = dir ?? chokidar.watch(rootDir);
    }

    watcher.add(watchDir);

    watcher.on("all", async (event, path) => {
      if (!path.startsWith(watchDir)) {
        return;
      }
      if (path.endsWith(TEMPORARY_FILE_SUFFIX)) {
        return;
      }
      if (event === "addDir") {
        return;
      }
      if (event === "unlinkDir") {
        for (const modName of Object.keys(require.cache)) {
          if (modName.startsWith(path)) {
            await remove(modName);
          }
        }
        await load();
        return;
      }

      if (event === "add" || event === "change") {
        await load(path);
      } else if (event === "unlink") {
        await remove(path);
      }
    });
  }

  return {
    base,
    load,
    watch,
    remove,
    moduleNames,
    get routes() {
      return moduleNames
        .map((modName) => {
          const mod = require.cache[modName];
          return mod?.exports.default;
        })
        .flat()
        .filter((e) => !!e) as FourzeRoute[];
    },
  };
}
