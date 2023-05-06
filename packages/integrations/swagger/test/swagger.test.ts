import type { Server } from "http";
import { connect, normalizeAddress } from "@fourze/server";
import express from "express";
import { createApp, defineRouter, randomInt } from "@fourze/core";
import { service } from "@fourze/swagger";
import { expect, test } from "vitest";
import axios from "axios";

test("test-swagger", async () => {
  const app = createApp({
    base: "/api",
    allow: ["/api/test", "/api/hello", "/api/add"],
    deny: ["/api/deny"]
  });

  const router = defineRouter({}).get("/test", {
    meta: {
      summary: "test"
    }
  }, () => {
    return {
      name: "test",
      count: randomInt(200)
    };
  });

  app.use(router);

  await app.ready();

  const swaggerRouter = service(app);

  const expressApp = express();

  //   expressApp.use(connect(app));

  expressApp.use(connect(swaggerRouter));

  const server: Server = await new Promise(resolve => {
    const _server = expressApp.listen(7609, "localhost", () => {
      resolve(_server);
    });
  });

  const origin = normalizeAddress(server.address(), {
    protocol: "http"
  });

  const url = `${origin ?? ""}/swagger-ui/index.html`;

  const response = await axios.get(url);

  expect(response.status).toEqual(200);

  const docs = await axios.get(`${origin ?? ""}/api-docs`);

  expect(docs.status).toEqual(200);
});
