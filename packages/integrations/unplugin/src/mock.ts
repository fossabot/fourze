import { normalize } from "@fourze/core";
import type { FourzeMockAppOptions } from "@fourze/mock";
import type { FourzeHmrApp } from "@fourze/server";
import dedent from "dedent";

export function defaultMockCode(
  app: FourzeHmrApp,
  options: FourzeMockAppOptions = {}
) {
  let code = "import {createMockApp} from \"@fourze/mock\";";

  const names: string[] = [];
  for (let i = 0; i < app.moduleNames.length; i++) {
    let modName = app.moduleNames[i];
    names[i] = `fourze_module_${i}`;
    modName = normalize(modName);

    code += dedent`
      \nimport ${names[i]} from "${modName}";\n
    `;
  }
  code += dedent`
  createMockApp({
    base:"${app.base}",
    modules:[${names.join(",")}].flat(),
    delay:${JSON.stringify(options.delay)},
    mode:${JSON.stringify(options.mode)},
    allow:${JSON.stringify(options.allow)},
  }).ready();`;
  return code;
}
