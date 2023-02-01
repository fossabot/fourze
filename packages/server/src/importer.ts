import { runInThisContext } from "vm";
import { Module, builtinModules } from "module";
import { platform } from "os";
import { pathToFileURL } from "url";
import { dirname, extname, join, normalize } from "pathe";
import { createLogger, escapeStringRegexp } from "@fourze/core";
import { readFileSync } from "fs-extra";
import { fileURLToPath, hasESMSyntax, interopDefault, resolvePathSync } from "mlly";
import createRequire from "create-require";
import type { PackageJson } from "pkg-types";

import type { Loader, TransformOptions } from "esbuild";
import { transformSync } from "esbuild";
export interface ModuleImporterOptions {
  esbuild?: TransformOptions
  define?: Record<string, string>
  interopDefault?: boolean
  requireCache?: boolean
  extensions?: string[]
}

type Require = typeof require;

const isWindow = platform() === "win32";

const defaults: ModuleImporterOptions = {
  extensions: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json"],
  interopDefault: true,
  requireCache: true,
  esbuild: {
    format: "cjs",
    target: "es6"
  }
};

export interface ModuleImporter extends Require {
  remove(id: string): void
}

export function readNearestPackageJSON(path: string): PackageJson | undefined {
  while (path && path !== "." && path !== "/") {
    path = join(path, "..");
    try {
      const pkg = readFileSync(join(path, "package.json"), "utf8");
      try {
        return JSON.parse(pkg);
      } catch {}
      break;
    } catch {}
  }
}

/**
 * Create a module importer
 * @inspired https://github.com/unjs/jiti
 * @param _filename
 * @param opts
 * @param parentModule
 * @returns
 */
export function createImporter(_filename: string, opts: ModuleImporterOptions = {}, parentModule?: NodeModule): ModuleImporter {
  opts = { ...defaults, ...opts };
  const logger = createLogger("@fourze/server");

  const nativeRequire = createRequire(isWindow ? _filename.replace(/\\/g, "/") : _filename);

  const tryResolve = (id: string, options?: { paths?: string[] }) => {
    try {
      return nativeRequire.resolve(id, options);
    } catch {
    }
  };

  const _additionalExts = [...(opts.extensions as string[])].filter(
    (ext) => ext !== ".js"
  );

  const _url = pathToFileURL(_filename);
  const nativeModules = ["typescript", ...([])];

  const isNativeRe = new RegExp(
    `node_modules/(${nativeModules
      .map((m) => escapeStringRegexp(m))
      .join("|")})/`
  );

  const _resolve = (id: string, options?: { paths?: string[] }) => {
    let resolved, err;
    try {
      resolved = resolvePathSync(id, {
        url: _url,
        conditions: ["node", "import", "require"]
      });
    } catch (_error) {
      err = _error;
    }
    if (resolved) {
      return resolved;
    }

    if (opts.extensions?.includes(extname(id))) {
      return nativeRequire.resolve(id, options);
    }

    try {
      return nativeRequire.resolve(id, options);
    } catch (error) {
      err = error;
    }

    for (const ext of _additionalExts) {
      resolved = tryResolve(id + ext, options) ?? tryResolve(`${id}/index${ext}`, options);
      if (resolved) {
        return resolved;
      }
    }

    throw err;
  };

  _resolve.paths = nativeRequire.resolve.paths;

  const aliasMap = new Map<string, string>();

  function getLoader(filename: string): Loader {
    const ext = extname(filename);
    switch (ext) {
      case ".js":
        return "js";
      case ".jsx":
        return "jsx";
      case ".json":
        return "json";
      case ".ts":
        return "ts";
      case ".tsx":
        return "tsx";
      case ".css":
        return "css";
      default:
        return "default";
    }
  }

  const _transform = (code: string, filename: string) => {
    return transformSync(code, {
      ...opts.esbuild,
      platform: opts.esbuild?.platform ?? "node",
      format: opts.esbuild?.format ?? "cjs",
      target: opts.esbuild?.target ?? "es6",
      loader: opts.esbuild?.loader ?? getLoader(filename),
      define: {
        "import.meta.url": JSON.stringify(pathToFileURL(filename).href),
        ...opts.define
      },
      treeShaking: opts.esbuild?.treeShaking ?? true
    }).code;
  };

  const _interopDefault = (m: any) => {
    return opts.interopDefault !== false ? interopDefault(m) : m;
  };

  const _require = function (id: string): NodeModule {
    if (id.startsWith("node:")) {
      id = id.slice(5);
    } else if (id.startsWith("file:")) {
      id = fileURLToPath(id);
    }

    if (builtinModules.includes(id) || id === ".pnp.js" /* #24 */) {
      logger.debug("[builtin]", id);
      return nativeRequire(id);
    }

    const filename = normalize(_resolve(id));

    const ext = extname(filename);

    aliasMap.set(id, filename);

    if (ext && !opts.extensions!.includes(ext)) {
      logger.debug("[unknown]", filename);
      return nativeRequire(id);
    }

    if (isNativeRe.test(filename)) {
      logger.debug("[native]", filename);
      return nativeRequire(id);
    }

    if (opts.requireCache && nativeRequire.cache[filename]) {
      logger.debug("[cache]", filename);
      return _interopDefault(nativeRequire.cache[filename]?.exports);
    }

    let source = readFileSync(filename, "utf-8");

    const isTypescript = ext === ".ts" || ext === ".tsx";

    const isCommonJS = ext === ".cjs";

    const isNativeModule
    = ext === ".mjs"
    || (ext === ".js" && readNearestPackageJSON(filename)?.type === "module");

    const needsTranspile = !isCommonJS && (isTypescript || isNativeModule || hasESMSyntax(source));

    if (needsTranspile) {
      const start = performance.now();
      source = _transform(source, filename);
      const time = Math.round((performance.now() - start) * 1000) / 1000;
      logger.debug(
        `[transpile]${isNativeModule ? " [esm]" : ""}`,
        filename,
        `(${time}ms)`
      );
    } else {
      try {
        logger.debug("[native]", filename);
        return _interopDefault(nativeRequire(id));
      } catch (error: any) {
        logger.debug("Native require error:", error);
        logger.debug("[fallback]", filename);
        source = _transform(source, filename);
      }
    }

    const mod = new Module(filename);
    mod.filename = filename;

    if (parentModule) {
      mod.parent = parentModule;
      if (
        Array.isArray(parentModule.children)
          && !parentModule.children.includes(mod)
      ) {
        parentModule.children.push(mod);
      }
    }

    mod.require = createImporter(filename, opts, mod);

    mod.path = dirname(filename);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    mod.paths = Module._nodeModulePaths(mod.path);

    if (opts.requireCache) {
      nativeRequire.cache[filename] = mod;
    }

    const compiled = runInThisContext(Module.wrap(source), {
      filename,
      lineOffset: 0,
      displayErrors: false
    });

    try {
      compiled(
        mod.exports,
        mod.require,
        mod,
        mod.filename,
        dirname(mod.filename)
      );
    } catch (error) {
      logger.error(error);
    }

    mod.loaded = true;

    const exports = _interopDefault(mod.exports);

    return exports;
  };

  _require.resolve = _resolve;
  _require.cache = nativeRequire.cache;
  _require.extensions = nativeRequire.extensions;
  _require.main = nativeRequire.main;
  _require.remove = function (id: string) {
    const filename = aliasMap.get(id);
    if (filename && nativeRequire.cache[filename]) {
      delete nativeRequire.cache[filename];
      logger.debug("[delete cache]", filename);
    }
    aliasMap.delete(id);
  };

  return _require as ModuleImporter;
}
