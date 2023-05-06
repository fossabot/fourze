import { expect, test } from "vitest";
import {
  isMatch,
  normalize,
  relativePath,
  resolvePath,
  resolves,
  slash
} from "../../src/utils/path";

test("test-slash", () => {
  const path = "/hello/world/";
  const base = "/api/";
  expect(slash(base, path)).toBe("/api/hello/world");
  expect(slash("api/hello")).toBe("/api/hello");
});

test("test-isMatch", () => {
  expect(isMatch("/api/hello/test", "/api/*", "/api/hello")).toBe(true);
});

test("test-relativePath", () => {
  const path = "/abc/def/ghi";
  const path2 = "/abc/def/ghi/";
  const path3 = "/abc/";
  const path4 = "/abc";
  const base = "/abc";
  const normalBase = "/";
  expect(relativePath(path, base)).toBe("/def/ghi");
  expect(relativePath(path2, base)).toBe("/def/ghi/");
  expect(relativePath(path3, base)).toBe("/");
  expect(relativePath(path4, base)).toBe("");
  expect(relativePath(path, normalBase)).toBe("/abc/def/ghi");
});

test("test-resolvePath", () => {
  const path = "https://test.com";
  const base = "/api";
  const final0 = resolvePath(path, base);
  expect(final0).toBe(path);
  const finalPath = resolvePath(path, base);
  expect(finalPath).toEqual(path);
  expect(resolvePath("//api/hello")).toEqual("/api/hello");
});

test("test-resolves", () => {
  expect(resolves("api/", "/hello/")).toEqual("/api/hello");
});

test("test-normalize", () => {
  expect(normalize("")).toEqual("/");
  expect(normalize("//abc")).toEqual("/abc");
  expect(normalize("//abc/")).toEqual("/abc");
  expect(normalize("\/\\/\/abc\\//a\\//c")).toEqual("/abc/a/c");
});
