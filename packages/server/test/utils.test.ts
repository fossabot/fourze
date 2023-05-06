import { expect, test } from "vitest";
import { resolveHostname } from "../src/utils";

test("test-resolve-hostname", async () => {
  const host = await resolveHostname("localhost");
  expect(host.name).toEqual("127.0.0.1");
});
