import { createQuery } from "@fourze/core";
import { describe, expect, it } from "vitest";

describe("array", async () => {
  it("mock-query", async () => {
    const query = createQuery<string>();
    query.set(0, "test");
    query.set(1, "test2");
    query.set(2, "test3");

    expect(query.get(0)).toEqual("test");
    expect(query.get(1)).toEqual("test2");
    expect(query.get(2)).toEqual("test3");
    expect(query.get(3)).toEqual(undefined);


    expect(query.length).toEqual(3);

    query.delete(1);

    expect(query.length).toEqual(2);

    query.set(0, "test2");
    query.set(1, "test3");

    expect(query.get(0)).toEqual("test2");
    expect(query.get(1)).toEqual("test3");
    expect(query.get(2)).toEqual(undefined);

    query.clear();

    expect(query.length).toEqual(0);

    query.append(...["test4", "test5", "test6"]);
    expect(query.length).toEqual(3);
    expect(query[0]).toEqual("test4");
    expect(query.get(1)).toEqual("test5");
    expect(query.get(2)).toEqual("test6");

    query.reset(createQuery(["test7", "test8", "test9"]));
    expect(query.length).toEqual(3);
    expect(query.get(0)).toEqual("test7");
    expect(query.get(1)).toEqual("test8");
    expect(query.get(2)).toEqual("test9");

    expect(delete query[-1]).toBeTruthy();
    expect(query.length).toEqual(3);
    expect(query[2]).toEqual(undefined);

  });

});
