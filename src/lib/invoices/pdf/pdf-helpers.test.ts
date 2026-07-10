import { describe, expect, it } from "vitest";

import { formatPdfAmount, formatPdfDate } from "./format";
import { parseLogoDataUrl } from "./logo";
import { sanitizePdfText } from "./text";

// 1×1 transparent PNG.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("sanitizePdfText", () => {
  it("keeps Latin-1 and cp1252 typography", () => {
    expect(sanitizePdfText("Café Ölmüz")).toBe("Café Ölmüz");
    expect(sanitizePdfText("€100 – ok")).toBe("€100 – ok"); // € and en-dash are cp1252
  });

  it("maps the Unicode minus sign to a hyphen", () => {
    expect(sanitizePdfText("−50%")).toBe("-50%");
  });

  it("replaces characters outside cp1252 with ?", () => {
    expect(sanitizePdfText("日本 A")).toBe("?? A");
  });

  it("turns control/whitespace characters into spaces", () => {
    expect(sanitizePdfText("a\tb\nc")).toBe("a b c");
  });
});

describe("formatPdfAmount", () => {
  it("groups thousands and prefixes the currency code", () => {
    expect(formatPdfAmount(123456, "EUR")).toBe("EUR 1,234.56");
    expect(formatPdfAmount(0, "EUR")).toBe("EUR 0.00");
    expect(formatPdfAmount(100000000, "USD")).toBe("USD 1,000,000.00");
  });
});

describe("formatPdfDate", () => {
  it("formats an ISO date deterministically", () => {
    expect(formatPdfDate("2026-01-10")).toBe("10 Jan 2026");
    expect(formatPdfDate("2026-12-31")).toBe("31 Dec 2026");
  });

  it("passes through a non-ISO value unchanged", () => {
    expect(formatPdfDate("n/a")).toBe("n/a");
  });
});

describe("parseLogoDataUrl", () => {
  it("decodes a valid png data URL", () => {
    const logo = parseLogoDataUrl(`data:image/png;base64,${PNG_1PX}`);
    expect(logo?.format).toBe("png");
    expect((logo?.bytes.length ?? 0) > 0).toBe(true);
  });

  it("recognises jpeg", () => {
    expect(parseLogoDataUrl(`data:image/jpeg;base64,${PNG_1PX}`)?.format).toBe("jpg");
  });

  it("returns null for missing/invalid/unsupported input", () => {
    expect(parseLogoDataUrl(null)).toBeNull();
    expect(parseLogoDataUrl("not-a-data-url")).toBeNull();
    expect(parseLogoDataUrl(`data:image/gif;base64,${PNG_1PX}`)).toBeNull();
  });
});
