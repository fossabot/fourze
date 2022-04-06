import { Plugin, normalizePath } from "vite";

import { createMiddleware, createRouter, logger } from "@fourze/core";

const PLUGIN_NAME = "vite-plugin-fourze";

const CLIENT_ID = "@fourze/mock";

const TEMPORARY_FILE_SUFFIX = ".tmp.js";

export interface VitePluginFourzeOptions {
  /**
   * @default 'src/mock'
   */
  dir?: string;

  /**
   * @default '/api'
   */
  base?: string;

  /**
   *  [".ts", ".js"]
   */
  filePattern?: (string | RegExp)[];
  /**
   * @default env.command == 'build' || env.mode === 'mock'
   */
  client: boolean;

  /**
   *  @default true
   *
   */
  hmr?: boolean;

  /**
   * @default "off"
   */
  logLevel: "off" | "info" | "warn" | "error";
}

export function VitePluginFourze(
  options: Partial<VitePluginFourzeOptions> = {}
): Plugin {
  const dir = (options.dir = options.dir ?? "./src/mock");

  const base = (options.base = options.base ?? "/api");

  const pattern = (options.filePattern = options.filePattern ?? [
    ".ts$",
    ".js$",
  ]);
  const hmr = (options.hmr = options.hmr ?? true);

  logger.level = options.logLevel ?? "off";

  const router = createRouter({
    dir,
    base,
    pattern,
  });

  return {
    name: PLUGIN_NAME,

    resolveId(id) {
      if (id === CLIENT_ID) {
        return `/${id}`;
      }
    },
    async buildStart() {
      await router.load();
    },

    config(config, env) {
      options.client =
        options.client ?? (env.command === "build" || env.mode === "mock");
      return {
        define: {
          VITE_PLUGIN_FOURZE_MOCK: options.client,
        },
      };
    },
    load(id) {
      if (id === `/${CLIENT_ID}`) {
        let code = "";
        if (options.client) {
          code += `
                    import { transformRoute } from "@fourze/shared";
                    import { mock, setup } from "mockjs"`;

          const names: string[] = [];
          for (let i = 0; i < router.moduleNames.length; i++) {
            let modName = router.moduleNames[i];
            names[i] = `fourze_route_${i}`;
            modName = modName.replace(TEMPORARY_FILE_SUFFIX, "");

            modName = normalizePath(modName);

            code += `
            import ${names[i]} from "${modName}"`;
          }
          code += `
                    const routes = [${names.join(",")}].flat()

                    for (let route of routes) {
                        const { regex, method = "get", match } = transformRoute(route)
                        mock(regex, method, request => {
                            const { url, body, headers} = request
                            const data = JSON.parse(body)
                            return match({ url, data, method, headers})
                        })
                    }
                    
                    setup({
                        timeout: "30-500"
                    })
            
                  `;
        }
        console.log(code);
        return code;
      }
    },

    configureServer({ middlewares, watcher }) {
      if (hmr) {
        router.watch(watcher);
      }
      const middleware = createMiddleware(router);
      middlewares.use(middleware);
    },
  };
}

export default VitePluginFourze;
