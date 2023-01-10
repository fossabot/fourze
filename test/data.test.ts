import { createRouter, randomInt, setLoggerLevel } from "@fourze/core";
import { createFourzeServer } from "@fourze/server";
import axios from "axios";
import { describe, expect, it } from "vitest";

describe("data", async () => {
  it("mock-data", async () => {
    const testData = {
      name: "test",
      count: randomInt(200),
    };
    setLoggerLevel("debug");

    const server = createFourzeServer({
      host: "localhost",
      port: 0,
    });

    const router = createRouter({})
      .route("/hello-1", "get", { name: String }, (req) => {
        return {
          name: req.data.name,
        };
      })
      .route("/hello-2", "get", () => {
        return testData;
      })
      .route("GET /hello-3", { test: String }, () => {
        return testData;
      })
      .post(
        "/hello",
        {
          name: {
            type: String,
            required: true,
            in: "body",
          },
        },
        (req) => {
          return {
            name: req.body.name,
          };
        }
      ).get("/avatar.jpg", (req, res) => {
        res.image(Buffer.from([0, 0, 0, 0]))
      });

    await router.setup();


    await server.use(router).listen();

    const axiosInstance =axios.create({
      baseURL:server.origin
    })

    const { name } = await axiosInstance
      .post<typeof testData>("/hello", testData)
      .then((r) => r.data);

    expect(name).toEqual(testData.name);

    const contentType = await axiosInstance("/avatar.jpg").then(r => r.headers["content-type"])
    expect(contentType).toEqual("image/jpeg")
  });
});
