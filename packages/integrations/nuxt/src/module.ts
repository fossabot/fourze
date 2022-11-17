import type { UnpluginFourzeOptions } from "@fourze/unplugin"
import fourzeUnplugin from "@fourze/unplugin"
import {
  addServerHandler,
  addTemplate,
  addVitePlugin,
  defineNuxtModule,
} from "@nuxt/kit"
import "@nuxt/schema"
import dedent from "dedent"
import { join } from "pathe"

export type ModuleOptions = UnpluginFourzeOptions

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@fourze/nuxt",
    configKey: "fourze",
  },
  defaults: {
    base: "/api",
    dir: "mock",
    mock: false,
  },
  setup(options, nuxt) {
    if (!nuxt.options.ssr) {
      addVitePlugin(fourzeUnplugin.vite(options))
    }
    else {
      const mockHandlerPath = join(nuxt.options.buildDir, "@fourze/client")

      addTemplate({
        filename: "@fourze/client",
        write: true,
        getContents() {
          return dedent`
                    import pkg from "@fourze/server"
                    import { defineEventHandler } from "h3"

                    const { createFourzeServer, createHotRouter } = pkg
                    const fourzeServer = createFourzeServer()
                    const hotRouter = createHotRouter({
                        base: "${options.base ?? "/api"}",
                        dir: "${options.dir ?? "./mock"}",
                        delay: ${JSON.stringify(options.delay ?? 0)},
                    })
                    fourzeServer.use(hotRouter)
                    const onNotFound = () => {
                        /** empty */
                    }

                    export default defineEventHandler(async event => {
                        await fourzeServer(event.req, event.res, onNotFound)
                    })
                  `
        },
      })

      addServerHandler({
        middleware: true,
        handler: mockHandlerPath,
      })
    }
  },
})
