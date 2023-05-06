// @vitest-environment jsdom

import { expect, test } from "vitest";
import {
  isBrowser,
  isFormData
} from "../../src/utils/is";

test("is-type-dom", () => {
  expect(isFormData(new FormData())).toBe(true);
  expect(isBrowser()).toBe(true);
});

