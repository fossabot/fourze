import type { Server } from "http";
import { createApp, defineRouter, randomInt } from "@fourze/core";
import { connect, createServer, normalizeAddress } from "@fourze/server";
import express from "connect";
import axios from "axios";
import { describe, expect, it } from "vitest";

describe("server", async () => {
  it("run-server", async () => {
    const host = "localhost";
    const port = 0;

    const app = createApp({
      base: "/api"
    });
    const server = createServer(app, {
      host,
      port
    });

    const testData = {
      name: "test",
      count: randomInt(200)
    };

    const router = defineRouter({}).get("/test", () => {
      return {
        ...testData
      };
    });

    server.use(router);

    await server.listen();

    const returnData = await axios
      .get<typeof testData>(`${server.origin}/api/test`)
      .then((r) => r.data);

    expect(returnData).toEqual(testData);
  });

  it("run-connect", async () => {
    const host = "localhost";
    const port = 0;

    const app = express();

    const testData = {
      name: "test",
      count: randomInt(200)
    };

    const router = defineRouter({}).get("/test", () => {
      return {
        ...testData
      };
    });

    app.use("/api/", connect(router));

    const server: Server = await new Promise(resolve => {
      const server = app.listen(port, host, () => {
        resolve(server);
      });
    });

    const origin = normalizeAddress(server.address(), {
      protocol: "http",
      hostname: host
    });

    const url = `${origin ?? ""}/api/test`;

    const returnData = await axios
      .get<typeof testData>(url)
      .then((r) => r.data);

    expect(returnData).toEqual(testData);
  });
});
