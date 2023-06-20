import { expect, test } from "vitest";
import { createRequest } from "../src/shared/request";

test("query", () => {
  const request = createRequest({
    url: "/api/test?name=hello&age=18&male=true"
  });
  expect(request.query).toEqual({
    name: "hello",
    age: "18",
    male: "true"
  });
});
