import fourzePlugin, { UnpluginFourzeOptions } from "@fourze/unplugin";
import type { WebpackPluginInstance } from "webpack";

export default fourzePlugin.webpack as (options: UnpluginFourzeOptions) => WebpackPluginInstance;
