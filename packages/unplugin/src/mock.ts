import type { FourzeHotRouter } from "@fourze/server"
import { normalizePath } from "@fourze/server"

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

export function defaultMockCode(router: FourzeHotRouter) {
    let code = `import {isRoute,setupMock} from "@fourze/core"`

    const names: string[] = []
    for (let i = 0; i < router.moduleNames.length; i++) {
        let modName = router.moduleNames[i]
        names[i] = `fourze_route_${i}`
        modName = modName.replace(TEMPORARY_FILE_SUFFIX, "")
        modName = normalizePath(modName)

        code += `
        import ${names[i]} from "${modName}"`
    }
    code += `
  const base = "${router.base}"
  const modules = [${names.join(",")}].flat()
  const delay = "${router.delay}"

  setupMock({base,modules,delay})`
    return code
}
