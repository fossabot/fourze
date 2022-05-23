import { FourzeRouter } from "@fourze/router"
import { normalizePath } from "vite"

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

export function mockJs(router: FourzeRouter) {
    let code = `import {defineRoute,isRoute} from "@fourze/core"`
    code += `
    import MockJs from "mockjs"`

    const names: string[] = []
    console.log(router.moduleNames)
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
  console.log(routes)
  for (let route of routes) {
      const { pathRegex, method = "", dispatch } = defineRoute({ ...route ,base: route.base ?? "${router.base}"})
      MockJs.mock(pathRegex, method, request => {
          const { url, body, headers} = request
          const rrr = dispatch({ url, body:JSON.parse(body), method, headers},{})
          console.log(rrr)
          return rrr
        })
    }
  `
    return code
}
