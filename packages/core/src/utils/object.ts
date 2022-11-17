import { isTruthy } from "./is"

/**
 * @see https://github.com/antfu/utils/blob/main/src/object.ts
 */
export function objectMap<K extends string, V, NK = K, NV = V>(
  obj: Record<K, V>,
  fn: (key: K, value: V) => [NK, NV] | undefined,
): Record<K, V> {
  return Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => fn(k as K, v as V))
      .filter(isTruthy),
  )
}

/**
 * @see https://github.com/antfu/utils/blob/main/src/object.ts
 */
export function isKeyOf<T extends object>(
  obj: T,
  key: keyof any,
): key is keyof T {
  return key in obj
}
