import { isArray, isPlainObject } from "./utils";

export type DefaultData = Record<string, unknown>;

export type PropIn = "body" | "query" | "path";

export type ExtractPropTypes<
  P extends Record<string, any>, In extends PropIn | "any" = "any", O = In extends PropIn ? Pick<P, InKeys<P, In>> : P
> = {
  [K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>;
} & {
  [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>;
} & DefaultData;

export type LooseRequired<T> = {
  [P in string & keyof T]: T[P];
};

export type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends
  | {
    required: true
  }
  | {
    default: any
  }
  | BooleanConstructor
  | {
    type: BooleanConstructor
  }
    ? T[K] extends {
      default: undefined | (() => undefined)
    }
      ? never
      : K
    : never;
}[keyof T];

export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

export type InKeys<T, In extends PropIn> = {
  [K in keyof T]: T[K] extends {
    in: In
  }
    ? K
    : never;
}[keyof T];

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

export type InferPropType<T> = [T] extends [null]
  ? any
  : [T] extends [
      {
        type: null | true
      }
    ]
      ? any
      : [T] extends [
          | ObjectConstructor
          | {
            type: ObjectConstructor
          }
        ]
          ? Record<string, any>
          : [T] extends [
              | BooleanConstructor
              | {
                type: BooleanConstructor
              }
            ]
              ? boolean
              : [T] extends [
                  | DateConstructor
                  | {
                    type: DateConstructor
                  }
                ]
                  ? Date
                  : [T] extends [
                      | (infer U)[]
                      | {
                        type: (infer U)[]
                      }
                    ]
                      ? U extends DateConstructor
                        ? Date | InferPropType<U>
                        : InferPropType<U>
                      : [T] extends [Prop<infer V, infer D>]
                          ? unknown extends V
                            ? IfAny<V, V, D>
                            : V
                          : T;

export type ObjectProps<P = Record<string, unknown>> = {
  [K in keyof P]: Prop<P[K]> | null;
};

export type NormalizedObjectProps<P = Record<string, unknown>> = {
  [K in keyof P]: NormalizedProps<P[K]> | null;
};

type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

type PropConstructor<T = any> =
  | {
    new(...args: any[]): T & {}
  }
  | {
    (): T
  }
  | PropMethod<T>;

type PropMethod<T, TConstructor = any> = [T] extends [
  ((...args: any) => any) | undefined
]
  ? {
      new(): TConstructor
      (): T
      readonly prototype: TConstructor
    }
  : never;

export interface PropOptions<Type = any, Default = Type> {
  type: PropType<Type>
  required?: boolean
  default?: Default | DefaultFactory<Default> | null | undefined | object
  validator?(value: unknown): boolean
  transform?(value: unknown): Type
  meta?: Record<string, any>
  in?: PropIn
}

export interface NormalizedProps<Type = any, Default = Type>
  extends PropOptions<Type, Default> {
  meta: Record<string, any>
  in?: PropIn
  required: boolean
  type: PropType<any>
  default?: Default | DefaultFactory<Default> | null | undefined | object
}

declare type DefaultFactory<T> = (props: DefaultData) => T | null | undefined;

export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

export function isExtends<D = any>(types: PropType<D>, value: PropType<D>): boolean {
  if (Array.isArray(types)) {
    return types.some((e) => isExtends(e, value));
  }
  return value === types;
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol|BigInt)$/;
const functionTypeCheckRE = /^\s*function (\w+)/;

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType(fn: PropType<any>) {
  const match = fn && fn.toString().match(functionTypeCheckRE);
  return match ? match[1] : "";
}

export function isInstanceOf<D = any>(type: PropType<D> | PropType<D>[], value: any): value is D {
  if (Array.isArray(type)) {
    return type.some((e) => isInstanceOf(e, value));
  }
  const expectedType = getType(type);
  let valid = true;
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === "object") {
      valid = value instanceof type;
    }
  } else if (expectedType === "Object") {
    valid = isPlainObject(value);
  } else if (expectedType === "Array") {
    valid = isArray(value);
  } else {
    try {
      valid = value instanceof type;
    } catch (e: any) {
      valid = false;
    }
  }
  return valid;
}
