import { Plugin, normalizePath } from "vite";

import { watchRoutes, FourzeRoute, useMockMiddleware } from "@fourze/core";

const PLUGIN_NAME = "vite-plugin-fourze";

const CLIENT_ID = "@fourze/mock";

const TEMPORARY_FILE_SUFFIX = ".tmp.js";

interface MockPluginOptions {
  /**
   * @default 'src/mock'
   */
  dir?: string;

  /**
   * @default '/api'
   */
  contextPath?: string;

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
}

export default function VitePluginFourze(
  options: Partial<MockPluginOptions> = {}
): Plugin {
  const dir = options.dir ?? "./src/mock";

  const contextPath = options.contextPath ?? "/api";

  const filePattern = options.filePattern ?? [".ts$", ".js$"];
  const hmr = options.hmr ?? true;

  const moduleNames: string[] = [];

  return {
    name: PLUGIN_NAME,

    resolveId(id) {
      if (id === CLIENT_ID) {
        return `/${id}`;
      }
    },
    async buildStart() {},

    config(config, env) {
      options.client =
        options.client ?? (env.command === "build" || env.mode === "mock");
      return {
        define: {
          VITE_PLUGIN_MOCKER_CLIENT: options.client,
        },
      };
    },
    load(id) {
      if (id === `/${CLIENT_ID}`) {
        let code = "";
        if (options.client) {
          code += `
                    import { mockTransform } from "@fourze/shared"
                    import { mock, setup } from "mockjs"`;

          const names: string[] = [];
          for (let i = 0; i < moduleNames.length; i++) {
            let modName = moduleNames[i];
            names[i] = `mock_route_${i}`;
            modName = modName.replace(TEMPORARY_FILE_SUFFIX, "");

            modName = normalizePath(modName);

            code += `
            import ${names[i]} from "${modName}"`;
          }
          code += `
                    const routes = [${names.join(",")}].flat()

                    for (let route of routes) {
                        const { regex, method = "get", match } = mockTransform(route)
                        console.log(regex)
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
        return code;
      }
    },

    configureServer({ middlewares, watcher }) {
      let context: { routes: FourzeRoute[] } = {
        routes: [],
      };

      context = watchRoutes({
        dir,
        pattern: filePattern,
        watcher,
        hmr,
        moduleNames,
      });

      const middleware = useMockMiddleware({
        base: contextPath,
        get routes() {
          return context.routes;
        },
      });
      middlewares.use(middleware);
    },
  };
}
