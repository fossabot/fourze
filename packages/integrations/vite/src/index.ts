import type { UnpluginFourzeOptions } from "@fourze/unplugin"
import fourzePlugin from "@fourze/unplugin"
import type { Plugin } from "vite"

export default fourzePlugin.vite as (options: UnpluginFourzeOptions) => Plugin
