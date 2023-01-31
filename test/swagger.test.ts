import { connect, normalizeAddress } from '@fourze/server';
import express from 'express';
import { createApp, defineRouter, delay, isMatch, randomInt, resolvePath } from "@fourze/core";
import { service } from "@fourze/swagger";
import { describe, expect, it } from "vitest";
import axios from 'axios';
import { Server } from 'http';

describe("shared", async () => {

  it("test-swagger", async () => {

    const app = createApp({
      base: '/api',
      delay: "200-500",
      allow: ["/api/test", "/api/hello", "/api/add"],
      deny: ["/api/deny"],
    })

    const router = defineRouter({}).get("/test", {
      meta: {
        summary: "test",
      }
    }, () => {
      return {
        name: "test",
        count: randomInt(200),
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
    })

    const url = `${normalizeAddress(server.address())}/swagger-ui/index.html`;

    const response = await axios.get(url)

    expect(response.status).toEqual(200);

  });
});
