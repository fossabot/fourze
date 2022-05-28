import { FourzeRouter } from "@fourze/router"
import { normalizePath } from "vite"

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

export function mockJs(router: FourzeRouter) {
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
  const routes = [${names.join(",")}].flat().filter(isRoute)

  setupMock({
    base:"${router.base}",
    routes
  })`
    return code
}
