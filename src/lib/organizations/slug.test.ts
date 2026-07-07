import { describe, expect, it } from "vitest";

import { resolveUniqueSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Acme Inc.")).toBe("acme-inc");
  });

  it("strips diacritics", () => {
    expect(slugify("Héllo Wörld")).toBe("hello-world");
  });

  it("collapses separators and trims hyphens", () => {
    expect(slugify("  --Foo   & Bar!! ")).toBe("foo-bar");
  });

  it("returns empty when there are no alphanumerics", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("resolveUniqueSlug", () => {
  it("uses the root slug when it is available", async () => {
    const slug = await resolveUniqueSlug("Acme", async () => false);
    expect(slug).toBe("acme");
  });

  it("appends the next free numeric suffix", async () => {
    const taken = new Set(["acme", "acme-2"]);
    const slug = await resolveUniqueSlug("Acme", async (candidate) => taken.has(candidate));
    expect(slug).toBe("acme-3");
  });

  it("falls back to 'org' for an empty base", async () => {
    const slug = await resolveUniqueSlug("!!!", async () => false);
    expect(slug).toBe("org");
  });
});
