import { createApp, defineRouter, randomInt, setLoggerLevel } from "@fourze/core";
import { createServer } from "@fourze/server";
import axios from "axios";
import { describe, expect, it } from "vitest";
import { createRouteMatcher } from "../packages/core/src/shared/matcher";

describe("matcher", async () => {
  it("mock-matcher", async () => {

    const matcher = createRouteMatcher<string>();

    matcher.add("/hello/1", "get", "hello-1");
    matcher.add("/hello/{abc}", "get", "hello-abc");
    matcher.add("/hello/1", "post", "hello-post");
    matcher.add("/hello/3", "all", "hello-3");

    expect(matcher.match("/hello/1", "get")).toEqual(["hello-1", null]);
    expect(matcher.match("/hello/2", "get")).toEqual(["hello-abc", { abc: "2" }]);
    expect(matcher.match("/hello/1", "post")).toEqual(["hello-post", null]);
    expect(matcher.match("/hello/3", "get")).toEqual(["hello-3", null]);
    expect(matcher.match("/hello/3", "post")).toEqual(["hello-3", null]);
  });

});
