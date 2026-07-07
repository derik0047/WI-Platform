import { describe, expect, it } from "vitest";

import { containsPattern, escapeLike } from "./search";

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeLike("Acme BV")).toBe("Acme BV");
  });
});

describe("containsPattern", () => {
  it("wraps an escaped term in wildcards", () => {
    expect(containsPattern("acme")).toBe("%acme%");
    expect(containsPattern("100%")).toBe("%100\\%%");
  });

  it("returns null for blank input", () => {
    expect(containsPattern("")).toBeNull();
    expect(containsPattern("   ")).toBeNull();
  });
});
