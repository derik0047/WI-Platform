import { describe, expect, it } from "vitest";

import { renderInvoicePdf, type InvoicePdfData, type InvoicePdfLine } from "./render-invoice-pdf";

const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function sampleLine(over: Partial<InvoicePdfLine> = {}): InvoicePdfLine {
  return {
    description: "Consulting services",
    quantity: "2.5",
    unit: "hour",
    unitPriceCents: 12000,
    discountLabel: null,
    vatLabel: "21%",
    lineTotalCents: 30000,
    ...over,
  };
}

function sample(over: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    generatedAt: new Date("2026-01-15T10:00:00.000Z"),
    company: {
      name: "Acme BV",
      legalName: "Acme Holding B.V.",
      addressLine: "Keizersgracht 1",
      postalCode: "1015 CW",
      city: "Amsterdam",
      country: "Netherlands",
      email: "billing@acme.nl",
      phone: "+31 20 000 0000",
      website: "acme.nl",
      kvkNumber: "12345678",
      vatNumber: "NL123456789B01",
      iban: "NL00BANK0123456789",
      bic: "BANKNL2A",
      bankName: "Bank NL",
      paymentTerms: "Payable within 14 days.",
      logoDataUrl: `data:image/png;base64,${PNG_1PX}`,
    },
    customer: {
      companyName: "Client BV",
      contactName: "Jane Doe",
      addressLine: "Damrak 70",
      postalCode: "1012 LM",
      city: "Amsterdam",
      country: "Netherlands",
      email: "ap@client.nl",
      vatNumber: "NL987654321B01",
      kvkNumber: "87654321",
    },
    invoice: {
      number: "INV-2026-0001",
      status: "sent",
      currency: "EUR",
      issueDate: "2026-01-10",
      dueDate: "2026-01-24",
      notes: "Thank you for your business.",
    },
    lines: [
      sampleLine(),
      sampleLine({ discountLabel: "-10%", vatLabel: "9%", lineTotalCents: 4500 }),
    ],
    vatBreakdown: [
      { label: "21%", reverseCharge: false, netCents: 30000, vatCents: 6300 },
      { label: "9%", reverseCharge: false, netCents: 4500, vatCents: 405 },
    ],
    totals: { subtotalCents: 34500, vatTotalCents: 6705, grandTotalCents: 41205 },
    ...over,
  };
}

function isPdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  const tail = new TextDecoder().decode(bytes.slice(-8));
  return head === "%PDF-" && tail.includes("%%EOF");
}

describe("renderInvoicePdf", () => {
  it("produces a valid, non-trivial PDF", async () => {
    const bytes = await renderInvoicePdf(sample());
    expect(isPdf(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("never crashes on non-Latin / special characters (WinAnsi-safe)", async () => {
    const bytes = await renderInvoicePdf(
      sample({
        customer: {
          ...sample().customer,
          companyName: "日本商事 −50 café",
          contactName: "Владимир",
        },
      }),
    );
    expect(isPdf(bytes)).toBe(true);
  });

  it("paginates a long line list without throwing", async () => {
    const lines = Array.from({ length: 80 }, (_, i) =>
      sampleLine({
        description: `Line item number ${i + 1} with a fairly long description to wrap`,
      }),
    );
    const bytes = await renderInvoicePdf(sample({ lines }));
    expect(isPdf(bytes)).toBe(true);
  });

  it("degrades gracefully when the logo bytes are valid base64 but not a real image", async () => {
    // "QUJDREVG" = base64("ABCDEF") — passes the data-URL check but embedPng rejects.
    const bytes = await renderInvoicePdf(
      sample({ company: { ...sample().company, logoDataUrl: "data:image/png;base64,QUJDREVG" } }),
    );
    expect(isPdf(bytes)).toBe(true);
  });

  it("renders with no lines, no logo and an empty company profile", async () => {
    const empty = sample();
    const bytes = await renderInvoicePdf({
      ...empty,
      company: {
        name: "Acme BV",
        legalName: null,
        addressLine: null,
        postalCode: null,
        city: null,
        country: null,
        email: null,
        phone: null,
        website: null,
        kvkNumber: null,
        vatNumber: null,
        iban: null,
        bic: null,
        bankName: null,
        paymentTerms: null,
        logoDataUrl: null,
      },
      lines: [],
      vatBreakdown: [],
      totals: { subtotalCents: 0, vatTotalCents: 0, grandTotalCents: 0 },
    });
    expect(isPdf(bytes)).toBe(true);
  });
});
