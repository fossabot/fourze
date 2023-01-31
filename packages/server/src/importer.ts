import { runInThisContext } from "vm";
import { Module, builtinModules } from "module";
import { platform } from "os";
import { dirname, extname, join } from "pathe";
import { createLogger, escapeStringRegexp } from "@fourze/core";
import fs from "fs-extra";
import { fileURLToPath, hasESMSyntax, interopDefault, resolvePathSync } from "mlly";
import createRequire from "create-require";
import type { PackageJson } from "pkg-types";

// eslint-disable-next-line import/order
import { pathToFileURL } from "url";
import { transformSync } from "esbuild";
export interface ModuleImporterOptions {
  external?: string[]
  define?: Record<string, string>
  interopDefault?: boolean
  cache?: boolean

  extensions?: string[]
}

type Require = typeof require;

const isWindow = platform() === "win32";

const defaults: ModuleImporterOptions = {
  extensions: [".js", ".mjs", ".cjs", ".ts"],
  interopDefault: true
};

export interface ModuleImporter extends Require {}

export function readNearestPackageJSON(path: string): PackageJson | undefined {
  while (path && path !== "." && path !== "/") {
    path = join(path, "..");
    try {
      const pkg = fs.readFileSync(join(path, "package.json"), "utf8");
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
export function createImporter(_filename: string, opts: ModuleImporterOptions, parentModule?: NodeModule): ModuleImporter {
  opts = { ...defaults, ...opts };
  const logger = createLogger("importer");

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

  const _transform = (code: string, filename: string, isTypescript: boolean) => {
    return transformSync(code, {
      platform: "node",
      format: "cjs",
      target: "es6",
      loader: isTypescript ? "ts" : "js",
      define: {
        "import.meta.url": JSON.stringify(filename),
        ...opts.define
      },
      treeShaking: true
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
      return nativeRequire(id);
    }

    const filename = _resolve(id);
    const ext = extname(filename);

    if (ext && !opts.extensions!.includes(ext)) {
      logger.debug("[unknown]", filename);
      return nativeRequire(id);
    }

    if (isNativeRe.test(filename)) {
      logger.debug("[native]", filename);
      return nativeRequire(id);
    }

    let source = fs.readFileSync(filename, "utf-8");

    const isTypescript = ext === ".ts";

    const isCommonJS = ext === ".cjs";

    const isNativeModule
    = ext === ".mjs"
    || (ext === ".js" && readNearestPackageJSON(filename)?.type === "module");

    const needsTranspile = !isCommonJS && (isTypescript || isNativeModule || hasESMSyntax(source));

    if (needsTranspile) {
      source = _transform(source, filename, isTypescript);
      logger.debug("[transform]", filename);
    } else {
      try {
        logger.debug("[native]", filename);
        return _interopDefault(nativeRequire(id));
      } catch (error: any) {
        logger.debug("Native require error:", error);
        logger.debug("[fallback]", filename);
        source = _transform(source, filename, isTypescript);
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

  return _require as ModuleImporter;
}
