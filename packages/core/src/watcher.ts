import { FSWatcher, watch } from "chokidar";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { FourzeRoute } from "@fourze/shared";

interface WatcherOptions {
  watcher?: FSWatcher;
  pattern?: (string | RegExp)[];
  dir?: string;
  hmr?: boolean;
  moduleNames?: string[];
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

export function watchRoutes(options: WatcherOptions) {
  const watchDir = path.resolve(process.cwd(), options.dir ?? "./routes");
  const pattern = transformPattern(options.pattern ?? [".ts", ".js"]);

  const watcher = options.watcher ?? watch(watchDir);
  const moduleNames: string[] = options.moduleNames ?? [];
  const hmr = options.hmr ?? true;

  const loadMockModules = async (dir: string) => {
    const stat = await fs.promises.stat(dir);
    if (stat.isDirectory()) {
      const files = await fs.promises.readdir(dir);
      for (let name of files) {
        loadMockModules(path.join(dir, name));
      }
    } else if (stat.isFile()) {
      if (!pattern.some((e) => e.test(dir))) {
        return;
      }
      await loadMockModule(dir);
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
    await deleteMockModule(moduleName);
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

  const deleteMockModule = async (moduleName: string) => {
    console.log("delete module cache", moduleName);
    delete require.cache[moduleName];
    for (const [i, modName] of moduleNames.entries()) {
      if (modName === moduleName) {
        moduleNames.splice(i, 1);
      }
    }
  };

  if (hmr) {
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
            await deleteMockModule(modName);
          }
        }
        await loadMockModules(watchDir);
        return;
      }

      if (event === "add" || event === "change") {
        await loadMockModule(path);
      } else if (event === "unlink") {
        await deleteMockModule(path);
      }
    });
  }

  loadMockModules(watchDir);

  return {
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
