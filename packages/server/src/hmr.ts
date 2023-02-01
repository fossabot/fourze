import fs from "fs";
import { basename, extname, join, resolve } from "path";
import {
  createApp,
  createLogger,
  defineMiddleware,
  isFourzeModule,
  isFunction,
  isString,
  overload
} from "@fourze/core";
import type {
  DelayMsType,
  FourzeApp,
  FourzeAppOptions,
  FourzeBaseRoute,
  FourzeModule,
  PropType
} from "@fourze/core";
import type { FSWatcher } from "chokidar";
import { normalizePath } from "./utils";
import { createImporter } from "./importer";

export interface FourzeHmrOptions extends Exclude<FourzeAppOptions, "setup"> {
  /**
   * 路由模块目录
   * @default "router"
   */
  dir?: string
  /**
   * 文件监听器
   */
  watcher?: FSWatcher

  /**
   * 文件匹配规则
   */
  pattern?: (string | RegExp)[]

  /**
   * 响应延迟时间
   * @default 0
   */
  delay?: DelayMsType

  alias?: Record<string, string>
}

export interface FourzeHmrBuildConfig {
  define?: Record<string, any>
  alias?: Record<string, string>
}

export interface FourzeHmrApp extends FourzeApp {
  watch(): this
  watch(dir: string): this
  watch(watcher: FSWatcher): this
  watch(dir: string, watcher: FSWatcher): this
  proxy(p: string | FourzeProxyOption): this
  configure(config: FourzeHmrBuildConfig): this
  delay?: DelayMsType
  readonly base: string
  readonly moduleNames: string[]
}

const TEMPORARY_FILE_SUFFIX = ".tmp.js";

function transformPattern(pattern: (string | RegExp)[]) {
  return pattern.map((p) => {
    if (isString(p)) {
      return new RegExp(p);
    }
    return p;
  });
}

export interface FourzeProxyOption extends Omit<FourzeBaseRoute, "handle"> {
  target?: string
}

export function createHmrApp(options: FourzeHmrOptions = {}): FourzeHmrApp {
  const rootDir = resolve(process.cwd(), options.dir ?? "router");

  const pattern = transformPattern(options.pattern ?? [".ts", ".js"]);
  const moduleMap = new Map<string, FourzeModule>();

  const logger = createLogger("@fourze/server");

  const buildConfig: FourzeHmrBuildConfig = {
    define: {},
    alias: {}
  };

  const app = createApp({
    ...options,
    setup: async () => {
      await load();
      return Array.from(moduleMap.values());
    }
  }) as FourzeHmrApp;

  const _import = createImporter(__filename);

  app.configure = function (this: FourzeHmrApp, newConfig: FourzeHmrBuildConfig) {
    buildConfig.define = {
      ...buildConfig.define,
      ...newConfig.define
    };

    buildConfig.alias = {
      ...buildConfig.alias,
      ...newConfig.alias
    };
    _import.configure({ ...buildConfig });
    return this;
  };

  async function load(moduleName: string = rootDir): Promise<boolean> {
    if (!fs.existsSync(moduleName)) {
      return false;
    }

    const loadModule = async (mod: string) => {
      const instance = _import(mod);

      if (isFourzeModule(instance)) {
        moduleMap.set(mod, instance);
        return true;
      }

      if (isFunction(instance)) {
        moduleMap.set(mod, defineMiddleware(basename(mod, extname(mod)), instance));
        return true;
      }
      logger.warn(`load module "${mod}" is not a valid module`);
      return false;
    };

    if (fs.existsSync(moduleName)) {
      const stat = await fs.promises.stat(moduleName);
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(moduleName);
        const tasks = files.map((name) => load(join(moduleName, name)));
        return await Promise.all(tasks).then((r) => r.some((f) => f));
      } else if (stat.isFile()) {
        if (!pattern.some((e) => e.test(moduleName))) {
          return false;
        }
        return loadModule(moduleName);
      }
    } else {
      logger.warn(`load file ${moduleName} not found`);
    }
    return false;
  }

  const _remove = app.remove;

  app.remove = function (this: FourzeHmrApp, moduleName: string) {
    _remove(moduleName);
    _import.remove(moduleName);
    moduleMap.delete(moduleName);
    return this;
  };

  app.watch = function (
    this: FourzeHmrApp,
    ...args: [] | [string, FSWatcher] | [string] | [FSWatcher]
  ) {
    const { dir, watcher } = overload(
      {
        dir: {
          type: String,
          default: () => rootDir
        },
        watcher: {
          type: Object as PropType<FSWatcher>,
          default: (): FSWatcher => {
            const chokidar = require("chokidar") as typeof import("chokidar");
            return chokidar.watch([]);
          }
        }
      },
      args
    );

    watcher.add(dir);

    watcher.on("all", async (event, path) => {
      if (!path.startsWith(dir) || path.endsWith(TEMPORARY_FILE_SUFFIX)) {
        return;
      }

      switch (event) {
        case "add": {
          const isLoaded = await load(path);
          if (isLoaded) {
            logger.info(`load module ${path}`);
          }
          break;
        }
        case "change": {
          this.remove(path);
          const isLoaded = await load(path);
          if (isLoaded) {
            logger.info(`reload module ${normalizePath(path)}`);
          }
          break;
        }
        case "unlink":
          this.remove(path);
          logger.info(`remove module ${path}`);
          break;
      }
      await this.reset();
    });
    return this;
  };

  return Object.defineProperties(app, {
    moduleNames: {
      get() {
        return [...moduleMap.keys()];
      },
      enumerable: true
    }
  });
}
