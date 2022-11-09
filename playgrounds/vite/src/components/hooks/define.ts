import { reactiveComputed } from "@vueuse/core";
import { ComponentPropsOptions, SetupContext } from "vue";

export function defineHooks<P extends object, R>(_: ComponentPropsOptions<P>, setup: (props: P, context: SetupContext) => R) {
  return (props: P | (() => P), context: SetupContext) => {
    const p = props instanceof Function ? reactiveComputed(() => props()) : props;
    return setup(p, context);
  };
}
