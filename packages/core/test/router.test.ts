import { expect, test } from "vitest";
import { createApp, defineRouter } from "@fourze/core";

test("router-send", async () => {
  const app = createApp();
  app.use(defineRouter(router => {
    router.route("/hello", (_, res) => {
      res.send("hello,world!");
    });
  }));
  await app.ready();
  const { response } = await app.service({
    url: "/hello"
  });
  expect(response.payload).toBe("hello,world!");
  expect(response.sent).toBe(true);
});

test("router-return", async () => {
  const app = createApp();
  app.use(defineRouter(router => {
    router.route("/hello", () => {
      return "hello,world!";
    });
  }));
  await app.ready();
  const { response } = await app.service({
    url: "/hello"
  });
  expect(response.payload).toBe("hello,world!");
  expect(response.sent).toBe(true);
});

test("router-undefined", async () => {
  const app = createApp();
  app.use(defineRouter(router => {
    router.route("/hello", () => {
      return undefined;
    });
  }));
  await app.ready();
  const { response } = await app.service({
    url: "/hello"
  });
  expect(response.payload).undefined;
  expect(response.sent).toBe(true);
});
