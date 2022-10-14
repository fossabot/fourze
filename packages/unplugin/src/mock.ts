import { FourzeMockRouterOptions } from "@fourze/core"
import type { FourzeHotRouter } from "@fourze/server"
import { normalizePath } from "@fourze/server"

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

export function defaultMockCode(router: FourzeHotRouter, options: FourzeMockRouterOptions) {
    const INJECT_KEY = "__FOURZE_MOCK_ROUTER__"

    let code = `import {createMockRouter} from "@fourze/core"`

    const names: string[] = []
    for (let i = 0; i < router.moduleNames.length; i++) {
        let modName = router.moduleNames[i]
        names[i] = `fourze_module_${i}`
        modName = modName.replace(TEMPORARY_FILE_SUFFIX, "")
        modName = normalizePath(modName)

        code += `
        import ${names[i]} from "${modName}"`
    }
    code += `
  globalThis.${INJECT_KEY} = createMockRouter({
    base:"${router.base}",
    modules:[${names.join(",")}].flat(),
    delay:${JSON.stringify(options.delay)},
    mode:${JSON.stringify(options.mode)},
    allow:${JSON.stringify(options.allow)}
  })`
    return code
}
