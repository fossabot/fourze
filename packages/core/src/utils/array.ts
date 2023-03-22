import { isDef, isFunction, isNumber, isString, isUndef } from "./is";
import { isKeyOf } from "./object";

export type PredicateFn<T> = (item: T, index: number, source: T[]) => boolean;

export type MapFn<T, U> = (item: T, index: number, source: T[]) => U;

export type CompareFn<T> = (a: T, b: T) => number;

export type PredicateParameter<T> = [PredicateFn<T>] | [keyof T, ...T[keyof T][]];

export type MapParameter<T, K> = keyof T | MapFn<T, K>;
export interface Predicate<T> extends PredicateFn<T> {
  and(...args: PredicateParameter<T>): this
  or(...args: PredicateParameter<T>): this
}
export interface WhereCollectionQuery<T>
  extends CollectionQuery<T>,
  Predicate<T> { }

export interface ExtraArrayMethods<T> {
  where(fn: PredicateFn<T>): WhereCollectionQuery<T>
  select<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  select(): CollectionQuery<T>
}

export interface MathQuery<T> {
  max(fn?: MapFn<T, number>): typeof fn extends undefined ? T extends number ? T : never : number
  min(fn?: MapFn<T, number>): typeof fn extends undefined ? T extends number ? T : never : number
  sum(fn?: MapFn<T, number>): typeof fn extends undefined ? T extends number ? T : never : number
  average(fn?: MapFn<T, number>): typeof fn extends undefined ? T extends number ? T : never : number
}

export interface ArrayQuery<T> extends Iterable<T> {

  join(
    separator?: string
  ): string

  at(index: number): T | undefined

  fill(value: T, start?: number, end?: number): this
  sort(compareFn?: CompareFn<T>): this
  reverse(): this

  includes(value: T, fromIndex?: number): boolean

  some(fn: PredicateFn<T>): boolean
  every(fn: PredicateFn<T>): boolean

  find(fn: PredicateFn<T>): T | undefined
  findIndex(fn: PredicateFn<T>): number
  findLast(fn: PredicateFn<T>): T | undefined
  findLastIndex(fn: PredicateFn<T>): number

  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U
  ): U
  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U
  ): U
  forEach(fn: (item: T, index: number) => void): void

  indexOf(value: T, fromIndex?: number): number
  lastIndexOf(value: T, fromIndex?: number): number

}

export interface CollectionBase<T> extends Iterable<T> {
  append(...items: T[]): this
  prepend(...items: T[]): this
  insert(index: number, ...items: T[]): this
  delete(index: number): this
  delete(fn: PredicateFn<T>, deleteLimit?: number): this
  replace(fn: PredicateFn<T>, item: T): this
  set(index: number, value: T): this
  get(index: number): T | undefined
  clear(): this
  reset(source?: Iterable<T>): this
  clone(): this
  first(): T | undefined
  last(): T | undefined
  [key: number]: T
  length: number
}

export interface CollectionQuery<T> extends CollectionBase<T>, ArrayQuery<T>, MathQuery<T> {
  where(fn: PredicateFn<T>): WhereCollectionQuery<T>
  where<K extends keyof T, V = T[K]>(key: K, ...values: V[]): WhereCollectionQuery<T>

  select<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  select<K extends keyof T>(key: K): CollectionQuery<T[K]>
  select(): CollectionQuery<T>

  chunk(size: number): CollectionQuery<T[]>

  union(...collections: T[]): this

  distinct(): this
  distinct<U>(selector: MapFn<T, U>): this
  distinct(selector: keyof T): this

  intersect(...collections: Iterable<T>[]): this
  except(...collections: Iterable<T>[]): this

  zip<U>(collection: Iterable<U>): CollectionQuery<[T, U]>
  zip<U, R>(
    collection: Iterable<U>,
    mapFn: (a: T, b: U) => R
  ): CollectionQuery<R>

  groupBy<K>(mapFn: MapParameter<T, K>): CollectionQuery<[K, T[]]>

  orderBy(fn: CompareFn<T>): this
  orderBy<K extends keyof T>(key: K, desc?: boolean, nullsFirst?: boolean): this

  countBy<K>(mapFn: MapParameter<T, K>): CollectionQuery<[K, number]>

  crossJoin<U>(collection: Iterable<U>): CollectionQuery<[T, U]>

  crossJoin<U, R>(
    collection: Iterable<U>,
    fn: (a: T, b: U) => R
  ): CollectionQuery<R>

  innerJoin<U, K, R>(
    collection: Iterable<U>,
    outerKeySelector: MapFn<T, K>,
    innerKeySelector: MapFn<U, K>,
    resultSelector: (a: T, b: U) => R
  ): CollectionQuery<R>

  leftJoin<U, K, R>(
    collection: Iterable<U>,
    outerKeySelector: MapFn<T, K>,
    innerKeySelector: MapFn<U, K>,
    resultSelector: (a: T, b: U | undefined) => R
  ): CollectionQuery<R>

  groupJoin<U, K, R>(
    collection: Iterable<U>,
    outerKeySelector: MapParameter<T, K>,
    innerKeySelector: MapParameter<U, K>,
    resultSelector: (a: T, b: U[]) => R
  ): CollectionQuery<R>

  concat(...collections: (ConcatArray<T> | T)[]): CollectionQuery<T>
  flat<D extends number = 1>(depth?: D): CollectionQuery<FlatArray<T[], D>>
  flatMap<U>(mapFn: MapFn<T, U[] | U>): CollectionQuery<U>

  map<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  filter(fn: PredicateFn<T>): CollectionQuery<T>
  slice(start?: number, end?: number): CollectionQuery<T>

  toArray(): T[]
  toSet(): Set<T>
  toMap<K extends string | number | symbol>(
    keySelector: MapFn<T, K>
  ): Map<K, T>
  toMap<K extends string | number | symbol, V>(
    keySelector: MapFn<T, K>,
    valueSelector: MapFn<T, V>
  ): Map<K, V>

  toJSON(): T[]

  toString(): string
}

export function createPredicate<T, Q>(
  ...args: PredicateParameter<T>
): Predicate<T> {
  const getPredicateFn = (...args: PredicateParameter<T>) => {
    const [fn] = args;
    if (isFunction(fn)) {
      return fn;
    }
    const values = args.slice(1) as T[keyof T][];
    return (item: T) => values.includes(item[fn]);
  };

  const predicate = getPredicateFn(...args) as Predicate<T>;

  predicate.and = (...args: PredicateParameter<T>) => {
    const predicateFn = getPredicateFn(...args);
    const oldPredicate = predicate;
    const newPredicate = createPredicate<T, Q>(
      (item: T, index: number, source: T[]) => oldPredicate(item, index, source) && predicateFn(item, index, source)
    );
    return newPredicate;
  };
  predicate.or = (...args: PredicateParameter<T>) => {
    const predicateFn = getPredicateFn(...args);
    const oldPredicate = predicate;
    const newPredicate = createPredicate<T, Q>(
      (item: T, index: number, source: T[]) => oldPredicate(item, index, source) || predicateFn(item, index, source)
    );
    return newPredicate;
  };
  return predicate;
}

export function createQuery<T>(
  initSource: Iterable<T> = []
): CollectionQuery<T> {
  const source = Array.from(initSource);

  const normalizeIndex = (index: number) => {
    if (index < 0) {
      return source.length + index;
    }
    return index;
  };

  const normalizeMapFn = <T, K = keyof T>(fn: MapParameter<T, K>) => {
    if (isDef(fn)) {
      if (isFunction(fn)) {
        return fn as MapFn<T, K>;
      }
      return (item: T) => item[fn as keyof T];
    }
    return (item: T) => item;
  };

  const self = new Proxy({
    where(...args: PredicateParameter<T>) {
      let predicate = createPredicate<T, CollectionQuery<T>>(...args);
      const query = self.clone() as WhereCollectionQuery<T>;
      query.and = (...args: PredicateParameter<T>) => {
        predicate = predicate.and(...args);
        return query;
      };
      query.or = (...args: PredicateParameter<T>) => {
        predicate = predicate.or(...args);
        return query;
      };
      query.select = (fn?: MapFn<T, any>) => {
        return createQuery(source.filter(predicate)).select(fn!);
      };
      return query;
    },
    select<U>(fn?: MapFn<T, U> | keyof T) {
      if (isDef(fn)) {
        if (isFunction(fn)) {
          return createQuery(source.map(fn));
        }
        return createQuery(source.map(item => item[fn]));
      }
      return createQuery(source);
    },
    insert(index: number, ...items: T[]) {
      source.splice(index, 0, ...items);
      return self;
    },
    append(...items: T[]) {
      source.push(...items);
      return self;
    },
    prepend(...items: T[]) {
      source.unshift(...items);
      return self;
    },
    delete(fn: number | PredicateFn<T>, deleteLimit?: number) {
      if (isNumber(fn)) {
        fn = normalizeIndex(fn);
        source.splice(fn, 1);
      } else {
        // 顺序批量删除

        const indices: number[] = [];

        for (let i = 0; i < source.length; i++) {
          if (deleteLimit && indices.length >= deleteLimit) {
            break;
          }
          if (fn(source[i], i, source)) {
            indices.push(i);
          }
        }

        for (let i = indices.length - 1; i >= 0; i--) {
          source.splice(indices[i], 1);
        }
      }
      return self;
    },
    concat(...items: (ConcatArray<T> | T)[]) {
      const newSource = source.concat(...items);
      return createQuery(newSource);
    },
    replace(fn: PredicateFn<T>, item: T) {
      for (let i = 0; i < source.length; i++) {
        if (fn(source[i], i, source)) {
          source[i] = item;
        }
      }
      return self;
    },
    max(fn?: MapFn<T, number>) {
      if (!fn) {
        fn = (item) => isNumber(item) ? item : 0;
      }
      return Math.max(...source.map(fn));
    },
    min(fn?: MapFn<T, number>) {
      if (!fn) {
        fn = (item) => isNumber(item) ? item : 0;
      }
      return Math.min(...source.map(fn));
    },
    sum(fn?: MapFn<T, number>) {
      if (!fn) {
        fn = (item) => isNumber(item) ? item : 0;
      }
      return source.map(fn).reduce((a, b) => a + b, 0);
    },
    average(fn?: MapFn<T, number>) {
      return self.sum(fn) / source.length;
    },

    distinct<U>(mapFn?: MapFn<T, U> | keyof T) {
      if (isUndef(mapFn)) {
        return self.reset(new Set(source));
      }

      const fn = isFunction(mapFn) ? mapFn : (item: T) => item[mapFn];

      const set = new Set();
      const array: T[] = [];
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = fn(item, i, source);
        if (!set.has(key)) {
          set.add(key);
          array.push(item);
        }
      }
      return self.reset(new Set(array));
    },
    intersect(...collections: Iterable<T>[]) {
      const set = new Set(collections.flatMap((c) => Array.from(c)));
      const array = source.filter((item) => set.has(item));
      return self.reset(array);
    },
    chunk(size: number) {
      const array: T[][] = [];
      for (let i = 0; i < source.length; i += size) {
        array.push(source.slice(i, i + size));
      }
      return createQuery(array);
    },
    union(...collections: Iterable<T>[]) {
      source.push(...collections.flatMap((c) => Array.from(c)));
      return self;
    },
    except(...collections: Iterable<T>[]) {
      const set = new Set(collections.flatMap((c) => Array.from(c)));
      const array = source.filter((item) => !set.has(item));
      return self.reset(array);
    },
    zip<U, R = [T, U]>(
      collection: Iterable<U>,
      mapFn: (a: T, b: U) => R = (a, b) => [a, b] as R
    ) {
      const array = Array.from(collection);
      const result = source.map((item, index) => mapFn(item, array[index]));
      return createQuery(result);
    },
    orderBy(arg: CompareFn<T> | keyof T, desc = false, nullsFirst = false) {
      const compareFn = isFunction(arg)
        ? arg
        : (a: T, b: T) => {
            const aVal = a[arg];
            const bVal = b[arg];
            if (aVal === bVal) {
              return 0;
            }
            if (isUndef(aVal)) {
              return nullsFirst ? -1 : 1;
            }
            if (isUndef(aVal)) {
              return nullsFirst ? 1 : -1;
            }
            return (aVal < bVal && !desc) ? -1 : 1;
          };
      source.sort(compareFn);
      return self;
    },
    countBy<K>(args: MapParameter<T, K>) {
      const mapFn = normalizeMapFn(args);
      const map = new Map();
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = mapFn(item, i, source);
        const count = map.get(key) ?? 0;
        map.set(key, count + 1);
      }
      const result = Array.from(map.entries());
      return createQuery(result);
    },
    groupBy<K = keyof T>(args: MapParameter<T, K>) {
      const mapFn = normalizeMapFn(args);
      const map = new Map();
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = mapFn(item, i, source);
        const array = map.get(key) ?? [];
        array.push(item);
        map.set(key, array);
      }
      const result = Array.from(map.entries());
      return createQuery(result);
    },
    groupJoin<U, K, R>(
      collection: Iterable<U>,
      outerKeySelector: MapParameter<T, K>,
      innerKeySelector: MapParameter<U, K>,
      resultSelector: (outer: T, inner: U[]) => R
    ) {
      const map = new Map();
      const outerMapFn = normalizeMapFn(outerKeySelector);
      const innerMapFn = normalizeMapFn(innerKeySelector);
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = outerMapFn(item, i, source);
        const array = map.get(key) ?? [];
        array.push(item);
        map.set(key, array);
      }
      const innerSource = Array.from(collection);
      const result = Array.from(map.entries()).flatMap(([key, value]) => {
        const inner = innerSource.filter((item, index) => innerMapFn(item, index, innerSource) === key);
        return value.map((item: T) => resultSelector(item, inner));
      });

      return createQuery(result);
    },
    crossJoin<U, R>(
      collection: Iterable<U>,
      resultSelector: (a: T, b: U) => R = (a, b) => [a, b] as R
    ) {
      const array = Array.from(collection);
      const result = source.flatMap((item) => array.map((i) => resultSelector(item, i)));
      return createQuery(result);
    },
    innerJoin<U, K, R>(
      collection: Iterable<U>,
      outerKeySelector: MapFn<T, K>,
      innerKeySelector: MapFn<U, K>,
      resultSelector: (a: T, b: U) => R = (a, b) => [a, b] as R
    ) {
      const array = Array.from(collection);
      const innerSource = Array.from(collection);
      const result = source.flatMap((item, index) => {
        const key = outerKeySelector(item, index, source);
        const inner = array.filter((i, iIndex) => innerKeySelector(i, iIndex, innerSource) === key);
        return inner.map((i) => resultSelector(item, i));
      });
      return createQuery(result);
    },
    leftJoin<U, K, R>(
      collection: Iterable<U>,
      outerKeySelector: MapFn<T, K>,
      innerKeySelector: MapFn<U, K>,
      resultSelector: (a: T, b: U | undefined) => R = (a, b) => [a, b] as R
    ) {
      const array = Array.from(collection);
      const result = source.flatMap((item, index) => {
        const key = outerKeySelector(item, index, source);
        const inner = array.find((i, iIndex) => innerKeySelector(i, iIndex, array) === key);
        return [resultSelector(item, inner)];
      });
      return createQuery(result);
    },
    slice(start: number, end: number) {
      return createQuery(source.slice(start, end));
    },
    set(index: number, item: T) {
      index = normalizeIndex(index);
      source[index] = item;
      return self;
    },
    get(index: number) {
      index = normalizeIndex(index);
      return source[index];
    },
    clear() {
      source.length = 0;
      return self;
    },
    clone() {
      return createQuery(source);
    },
    reset(iterable: Iterable<T> = initSource) {
      source.splice(0, source.length, ...iterable);
      return self;
    },
    toMap(keySelector: MapFn<T, any>, valueSelector?: MapFn<T, any>) {
      const map = new Map();
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = keySelector(item, i, source);
        const value = valueSelector ? valueSelector(item, i, source) : item;
        map.set(key, value);
      }
      return map;
    }
  }, {
    get(target, prop) {
      if (isString(prop)) {
        const index = Number(prop);
        if (!isNaN(index)) {
          return target.get(index);
        }
      }
      switch (prop) {
        case "toString":
          return () => source.toString();
        case "toJSON":
          return () => source;
        case "toSet":
          return () => new Set(source);
        case "toArray":
          return () => Array.from(source);
        case Symbol.iterator:
          return () => source[Symbol.iterator]();
        case "reverse":
        case "sort":
          return (...args: any) => {
            source[prop](...args);
            return self;
          };
        case "includes":
        case "indexOf":
        case "lastIndexOf":
          return (item: T, fromIndex = -1) => {
            fromIndex = normalizeIndex(fromIndex);
            return source[prop](item, fromIndex);
          };
        case "fill":
          return (value: T, start = 0, end = source.length) => {
            start = normalizeIndex(start);
            end = normalizeIndex(end);
            source.fill(value, start, end);
            return self;
          };
        case "flat":
          return (depth?: number) => {
            return createQuery(source.flat(depth));
          };
        case "flatMap":
          return <U>(mapFn: MapFn<T, U | U[]>) => {
            return createQuery(source.flatMap(mapFn));
          };
      }
      if (isKeyOf(target, prop)) {
        return target[prop];
      }
      return source[prop as keyof Array<T>];
    },
    set(target, prop, value) {
      if (isString(prop)) {
        const index = +prop;
        if (!isNaN(index)) {
          target.set(index, value);
          return true;
        }
      }
      if (prop === "length") {
        source.length = value;
        return true;
      }
      target[prop as Exclude<keyof typeof target, "length">] = value;
      return true;
    },
    deleteProperty(target, prop) {
      if (isString(prop)) {
        let index = +prop;
        if (!isNaN(index)) {
          index = normalizeIndex(index);
          return delete source[index];
        }
      }
      if (prop === "length") {
        source.length = 0;
        return true;
      }
      return false;
    }
  }) as unknown as CollectionQuery<T>;

  return self;
}

export function range(
  start: number,
  end: number,
  step = 1
): CollectionQuery<number> {
  const source = [];
  for (let i = start; i < end; i += step) {
    source.push(i);
  }
  return createQuery(source);
}

export function unique<T>(array: Iterable<T>) {
  return Array.from(new Set(array));
}
