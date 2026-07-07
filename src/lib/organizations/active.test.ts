import { describe, expect, it } from "vitest";

import { resolveActiveOrganization } from "./active";

const orgs = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("resolveActiveOrganization", () => {
  it("returns null when there are no organizations", () => {
    expect(resolveActiveOrganization([], "a")).toBeNull();
  });

  it("returns the persisted organization when it is a valid membership", () => {
    expect(resolveActiveOrganization(orgs, "b")?.id).toBe("b");
  });

  it("falls back to the first organization when the id is missing", () => {
    expect(resolveActiveOrganization(orgs, null)?.id).toBe("a");
  });

  it("falls back to the first organization when the id is not a membership", () => {
    expect(resolveActiveOrganization(orgs, "zzz")?.id).toBe("a");
  });
});
