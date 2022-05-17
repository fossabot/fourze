import { FourzeRouter } from "@fourze/router"
import { normalizePath } from "vite"

const TEMPORARY_FILE_SUFFIX = ".tmp.js"

export function transformCode(router: FourzeRouter) {
    let code = ""
    code += `
  import { transformRoute } from "@fourze/core";
  import { mock, setup } from "mockjs"`

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
  `
    return code
}
