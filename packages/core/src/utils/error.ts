import { isString } from "./is";

export function raise(error: unknown): never {
  throw (isString(error) ? new Error(error) : error);
}

export function assert(condition: any, error?: string | Error): asserts condition {
  if (!condition) {
    raise(error ?? "Assertion failed");
  }
}
