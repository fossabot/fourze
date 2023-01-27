import type { ExtractPropTypes, PropType } from "../props";
import { isInstanceOf } from "../props";
import { isFunction, isUndef } from "./is";

type OverloadConfig<P = Record<string, unknown>> = {
  [K in keyof P]: OverloadProp<P[K]> | null;
};

type OverloadProp<T = any, D = T> = OverloadOptions<T, D> | PropType<T>;

export interface OverloadOptions<Type = any, Default = Type> {
  type: PropType<Type>
  required?: boolean
  default?: (value: Type) => Default
  transform?: (value: Type) => any
  match?: (value: Type) => boolean
  rest?: boolean
}

export function defineOverload<Config extends OverloadConfig>(
  config: Config
) {
  return (args: any[]): ExtractPropTypes<Config> => {
    const result: any = {};
    const parameters = Array.from(args);
    for (const name in config) {
      const props = config[name];
      const types: PropType<any>[] = [];
      let required = false;
      let transform: ((value: any) => any) | undefined;
      let match: (value: any) => boolean | undefined;
      let defaultValue: ((value: any) => any) | undefined;
      if (isFunction(props)) {
        types.push(props);
      } else if (props != null) {
        if (Array.isArray(props)) {
          types.push(...props);
        } else {
          types.push(props.type);
          required = !!props.required || !!props.default;
          transform = props.transform;
          defaultValue = props.default;
        }
      }

      function matchValue(value: any) {
        if (match) {
          return match(value);
        }
        if (isUndef(value)) {
          return !required;
        }
        return isInstanceOf(types, value);
      }

      const value = parameters.shift();

      if (matchValue(value)) {
        result[name] = transform ? transform(value) : value;
        continue;
      } else if (defaultValue) {
        result[name] = defaultValue(result);
      }

      parameters.unshift(value);
    }
    if (Object.keys(result).length === Object.keys(config).length) {
      return result;
    }

    return result as ExtractPropTypes<Config>;
  };
}

export function overload<Config extends OverloadConfig = OverloadConfig>(
  config: Config,
  args: any[]
) {
  const overloadFn = defineOverload(config);
  return overloadFn(args);
}
