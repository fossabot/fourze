import { expect, test } from "vitest";
import {
  isMatch,
  relativePath,
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
  expect(resolves(path, base)).toBe("https://test.com/api");
});

