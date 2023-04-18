import { createApp, createRequest, createResponse } from "@fourze/core";
import { suite } from "../lib/suite";

async function run() {
  await suite("request", 100000, () => {
    createRequest({
      url: "/hello",
      method: "GET",
      headers: {
        "content-type": "application/json"
      },
      body: {
        name: "hello"
      }
    });
  });
  await suite("response", 100000, () => {
    createResponse({
      url: "/hello",
      method: "GET",
      request: {} as any
    });
  });

  const app = createApp();
  app.use("/", (req, res) => {
    res.send("hello", "application/json");
  });

  await suite("createApp", 100000, async () => {
    await app.service({
      url: "/",
      method: "GET"
    });
  });
}

run();
