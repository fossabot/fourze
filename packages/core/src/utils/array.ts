import { isNumber, isString } from "./is";
import { isKeyOf } from "./object";

export type PredicateFn<T> = (item: T, index: number) => boolean;

export type MapFn<T, U> = (item: T, index: number) => U;

export type CompareFn<T> = (a: T, b: T) => number;

export interface Predicate<T> extends PredicateFn<T> {
  and(predicateFm: PredicateFn<T>): this
  or(predicateFm: PredicateFn<T>): this
}
export interface WhereCollectionQuery<T>
  extends CollectionQuery<T>,
  Predicate<T> { }

export interface ExtraArrayMethods<T> {
  where(fn: PredicateFn<T>): WhereCollectionQuery<T>
  select<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  select(): CollectionQuery<T>

}

export interface CollectionQuery<T> extends Iterable<T> {
  where(fn: PredicateFn<T>): WhereCollectionQuery<T>
  select<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  select(): CollectionQuery<T>

  append(...items: T[]): this
  prepend(...items: T[]): this
  insert(index: number, ...items: T[]): this
  delete(index: number): this
  delete(fn: PredicateFn<T>): this

  union(...collections: Iterable<T>[]): this
  distinct(): this
  distinct<U>(mapFn: MapFn<T, U>): this
  intersect(...collections: Iterable<T>[]): this
  except(...collections: Iterable<T>[]): this
  zip<U>(collection: Iterable<U>): CollectionQuery<[T, U]>
  zip<U, R>(
    collection: Iterable<U>,
    mapFn: (a: T, b: U) => R
  ): CollectionQuery<R>
  groupBy<K>(mapFn: MapFn<T, K>): CollectionQuery<[K, T[]]>

  fill(value: T, start?: number, end?: number): this
  slice(start?: number, end?: number): this
  flat<D extends number = 1>(depth?: D): CollectionQuery<FlatArray<T[], D>>
  includes(value: T, fromIndex?: number): boolean
  some(fn: PredicateFn<T>): boolean
  every(fn: PredicateFn<T>): boolean
  reverse(): this
  sort(compareFn: CompareFn<T>): this
  find(fn: PredicateFn<T>): T | undefined
  findIndex(fn: PredicateFn<T>): number
  indexOf(value: T, fromIndex?: number): number
  lastIndexOf(value: T, fromIndex?: number): number
  join(separator?: string): string
  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U
  ): U
  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U,
    initialValue: U
  ): U
  forEach(fn: (item: T, index: number) => void): void
  map<U>(mapFn: MapFn<T, U>): CollectionQuery<U>
  filter(fn: PredicateFn<T>): CollectionQuery<T>
  first(): T | undefined
  last(): T | undefined
  set(index: number, value: T): this
  get(index: number): T | undefined

  at(index: number): T | undefined

  clear(): this
  reset(source?: Iterable<T>): this
  clone(): this

  toArray(): T[]
  toSet(): Set<T>
  toJSON(): T[]

  readonly length: number

  [key: number]: T
  // set(index: number, value: T): this
  // get(index: number): T | undefined
}

export function createPredicate<T, Q>(
  predicateFn: PredicateFn<T>
): Predicate<T> {
  const predicate = predicateFn as Predicate<T>;
  predicate.and = (fn: PredicateFn<T>) => {
    const oldPredicate = predicate;
    const newPredicate = createPredicate<T, Q>(
      (item: T, index: number) => oldPredicate(item, index) && fn(item, index)
    );
    return newPredicate;
  };
  predicate.or = (fn: PredicateFn<T>) => {
    const oldPredicate = predicate;
    const newPredicate = createPredicate<T, Q>(
      (item: T, index: number) => oldPredicate(item, index) || fn(item, index)
    );
    return newPredicate;
  };
  return predicate;
}

export function createQuery<T>(
  initSource: Iterable<T> = []
): CollectionQuery<T> {
  const source = Array.from(initSource);

  const normalize = (index: number) => {
    if (index < 0) {
      return source.length + index;
    }
    return index;
  };

  const q = new Proxy({
    where(predicateFn: PredicateFn<T>) {
      let predicate = createPredicate(predicateFn);
      const query = this.clone() as WhereCollectionQuery<T>;
      query.and = (fn: PredicateFn<T>) => {
        predicate = predicate.and(fn);
        return query;
      };
      query.or = (fn: PredicateFn<T>) => {
        predicate = predicate.or(fn);
        return query;
      };
      query.select = (fn?: MapFn<T, any>) => {
        return createQuery(source.filter(predicate)).select(fn!);
      };
      return query;
    },
    select<U>(fn?: (item: T, index: number) => U) {
      if (fn) {
        return createQuery(source.map(fn));
      }
      return createQuery(source);
    },
    insert(index: number, ...items: T[]) {
      source.splice(index, 0, ...items);
      return this;
    },
    append(...items: T[]) {
      source.push(...items);
      return this;
    },
    prepend(...items: T[]) {
      source.unshift(...items);
      return this;
    },
    delete(fn: number | PredicateFn<T>) {
      if (isNumber(fn)) {
        fn = normalize(fn);
        source.splice(fn, 1);
      } else {
        for (let i = source.length - 1; i >= 0; i--) {
          if (fn(source[i], i)) {
            source.splice(i, 1);
          }
        }
      }
      return this;
    },
    distinct<U>(mapFn?: MapFn<T, U>) {
      if (!mapFn) {
        return this.reset(new Set(source));
      }
      const set = new Set<U>();
      const array: T[] = [];
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = mapFn(item, i);
        if (!set.has(key)) {
          set.add(key);
          array.push(item);
        }
      }
      return this.reset(new Set(array));
    },
    intersect(...collections: Iterable<T>[]) {
      const set = new Set(collections.flatMap((c) => Array.from(c)));
      const array = source.filter((item) => set.has(item));
      return this.reset(array);
    },
    union(...collections: Iterable<T>[]) {
      source.push(...collections.flatMap((c) => Array.from(c)));
      return this;
    },
    except(...collections: Iterable<T>[]) {
      const set = new Set(collections.flatMap((c) => Array.from(c)));
      const array = source.filter((item) => !set.has(item));
      return this.reset(array);
    },
    zip<U, R = [T, U]>(
      collection: Iterable<U>,
      mapFn: (a: T, b: U) => R = (a, b) => [a, b] as R
    ) {
      const array = Array.from(collection);
      const result = source.map((item, index) => mapFn(item, array[index]));
      return createQuery(result);
    },
    groupBy<K>(mapFn: MapFn<T, K>) {
      const map = new Map<K, T[]>();
      for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const key = mapFn(item, i);
        const array = map.get(key) ?? [];
        array.push(item);
        map.set(key, array);
      }
      const result = Array.from(map.entries());
      return createQuery(result);
    },
    fill(value: T, start = 0, end = source.length) {
      start = normalize(start);
      end = normalize(end);
      source.fill(value, start, end);
      return this;
    },
    slice(start: number, end: number) {
      return createQuery(source.slice(start, end));
    },
    set(index: number, item: T) {
      index = normalize(index);
      source[index] = item;
      return this;
    },
    get(index: number) {
      index = normalize(index);
      return source[index];
    },
    clear() {
      source.length = 0;
      return this;
    },
    clone() {
      return createQuery(source);
    },
    reset(iterable: Iterable<T> = initSource) {
      source.splice(0, source.length, ...iterable);
      return this;
    }
  }, {
    get(target, prop) {
      if (isString(prop)) {
        const index = +prop;
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
          return (...args: any[]) => {
            source[prop](...args);
            return target;
          };
        case "includes":
        case "indexOf":
        case "lastIndexOf":
          return (item: T, fromIndex = -1) => {
            fromIndex = normalize(fromIndex);
            return source[prop](item, fromIndex);
          };
        case "flat":
          return (depth?: number) => {
            return createQuery(source.flat(depth));
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
      target[prop as keyof typeof target] = value;
      return true;
    },
    deleteProperty(target, prop) {
      if (isString(prop)) {
        let index = +prop;
        if (!isNaN(index)) {
          index = normalize(index);
          return delete source[index];
        }
      }
      if (prop === "length") {
        source.length = 0;
        return true;
      }
      return false;
    }
  });

  return q as CollectionQuery<T>;
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
