import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

import { formatPdfAmount, formatPdfDate, formatPdfNumber } from "@/lib/invoices/pdf/format";
import { parseLogoDataUrl } from "@/lib/invoices/pdf/logo";
import { sanitizePdfText } from "@/lib/invoices/pdf/text";

/**
 * Renders a professional A4 invoice PDF with pdf-lib (pure JS, no headless
 * browser). All amounts come from the persisted invoice totals — nothing is
 * recalculated here. Every drawn string is WinAnsi-sanitized so an exotic name
 * can never crash rendering; the line table paginates across A4 pages.
 */

export type InvoicePdfLine = {
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: number;
  discountLabel: string | null; // e.g. "-10%" or "-EUR 5.00"
  vatLabel: string; // e.g. "21%" or "R/C"
  lineTotalCents: number;
};

export type InvoicePdfData = {
  generatedAt: Date;
  company: {
    name: string;
    legalName: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    kvkNumber: string | null;
    vatNumber: string | null;
    iban: string | null;
    bic: string | null;
    bankName: string | null;
    paymentTerms: string | null;
    logoDataUrl: string | null;
  };
  customer: {
    companyName: string;
    contactName: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    vatNumber: string | null;
    kvkNumber: string | null;
  };
  invoice: {
    number: string;
    status: string;
    currency: string;
    issueDate: string;
    dueDate: string;
    notes: string | null;
  };
  lines: InvoicePdfLine[];
  vatBreakdown: { label: string; reverseCharge: boolean; netCents: number; vatCents: number }[];
  totals: { subtotalCents: number; vatTotalCents: number; grandTotalCents: number };
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const LEFT = MARGIN;
const RIGHT = PAGE_W - MARGIN;
const BOTTOM = MARGIN + 26;

const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.44, 0.44, 0.48);
const RULE = rgb(0.82, 0.82, 0.85);
const ACCENT = rgb(0.16, 0.2, 0.42);

// Line-table columns (right edges for numeric cells).
const COL = { desc: LEFT, descWidth: 250, qtyR: 332, priceR: 424, vatR: 470, amtR: RIGHT };

function compact(parts: Array<string | null | undefined>, sep = "  "): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(sep);
}

function companyLines(c: InvoicePdfData["company"]): string[] {
  return [
    compact([c.addressLine]),
    compact([c.postalCode, c.city]),
    compact([c.country]),
    compact([c.phone && `T ${c.phone}`, c.email]),
    compact([c.website]),
    compact([c.kvkNumber && `KVK ${c.kvkNumber}`, c.vatNumber && `VAT ${c.vatNumber}`]),
  ].filter(Boolean);
}

function customerLines(c: InvoicePdfData["customer"]): string[] {
  return [
    compact([c.contactName]),
    compact([c.addressLine]),
    compact([c.postalCode, c.city]),
    compact([c.country]),
    compact([c.email]),
    compact([c.kvkNumber && `KVK ${c.kvkNumber}`, c.vatNumber && `VAT ${c.vatNumber}`]),
  ].filter(Boolean);
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(sanitizePdfText(`Invoice ${data.invoice.number}`));
  doc.setCreator("WI Platform");
  doc.setProducer("WI Platform");
  doc.setCreationDate(data.generatedAt);
  doc.setModificationDate(data.generatedAt);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  const parsedLogo = parseLogoDataUrl(data.company.logoDataUrl);
  if (parsedLogo) {
    try {
      logo =
        parsedLogo.format === "png"
          ? await doc.embedPng(parsedLogo.bytes)
          : await doc.embedJpg(parsedLogo.bytes);
    } catch {
      logo = null; // never let a bad image break the invoice
    }
  }

  const state = { page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };

  const draw = (s: string, x: number, y: number, size: number, f: PDFFont, color = INK) =>
    state.page.drawText(sanitizePdfText(s), { x, y, size, font: f, color });
  const widthOf = (s: string, size: number, f: PDFFont) =>
    f.widthOfTextAtSize(sanitizePdfText(s), size);
  const drawRight = (s: string, xr: number, y: number, size: number, f: PDFFont, color = INK) =>
    draw(s, xr - widthOf(s, size, f), y, size, f, color);
  const rule = (y: number, thickness = 0.5, color = RULE) =>
    state.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness, color });

  const newPage = () => {
    state.page = doc.addPage([PAGE_W, PAGE_H]);
    state.y = PAGE_H - MARGIN;
  };
  const ensure = (need: number): boolean => {
    if (state.y - need < BOTTOM) {
      newPage();
      return true;
    }
    return false;
  };

  function wrap(s: string, size: number, f: PDFFont, maxW: number): string[] {
    const words = sanitizePdfText(s).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (!current || f.widthOfTextAtSize(trial, size) <= maxW) current = trial;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ---- Header: logo + company (left), INVOICE + meta (right) ----
  const headerTop = state.y;
  let leftY = headerTop;
  if (logo) {
    const scale = Math.min(130 / logo.width, 46 / logo.height, 1);
    const w = logo.width * scale;
    const h = logo.height * scale;
    state.page.drawImage(logo, { x: LEFT, y: headerTop - h, width: w, height: h });
    leftY = headerTop - h - 12;
  }
  draw(data.company.legalName || data.company.name, LEFT, leftY - 12, 13, bold);
  leftY -= 18;
  for (const l of companyLines(data.company)) {
    draw(l, LEFT, leftY - 9, 9, font, MUTED);
    leftY -= 12;
  }

  let rightY = headerTop;
  drawRight("INVOICE", RIGHT, rightY - 18, 22, bold, ACCENT);
  rightY -= 30;
  const meta: Array<[string, string]> = [
    ["Invoice no.", data.invoice.number],
    ["Status", capitalize(data.invoice.status)],
    ["Issue date", formatPdfDate(data.invoice.issueDate)],
    ["Due date", formatPdfDate(data.invoice.dueDate)],
  ];
  for (const [k, v] of meta) {
    drawRight(k, RIGHT - 120, rightY - 9, 9, font, MUTED);
    drawRight(v, RIGHT, rightY - 9, 9, bold);
    rightY -= 14;
  }

  state.y = Math.min(leftY, rightY) - 16;

  // ---- Bill to ----
  draw("BILL TO", LEFT, state.y - 8, 8, bold, MUTED);
  state.y -= 15;
  draw(data.customer.companyName, LEFT, state.y - 10, 10, bold);
  state.y -= 14;
  for (const l of customerLines(data.customer)) {
    draw(l, LEFT, state.y - 9, 9, font, MUTED);
    state.y -= 12;
  }
  state.y -= 14;

  // ---- Line items table ----
  const drawTableHeader = () => {
    draw("Description", COL.desc, state.y - 8, 8, bold, MUTED);
    drawRight("Qty", COL.qtyR, state.y - 8, 8, bold, MUTED);
    drawRight("Unit price", COL.priceR, state.y - 8, 8, bold, MUTED);
    drawRight("VAT", COL.vatR, state.y - 8, 8, bold, MUTED);
    drawRight(`Amount (${data.invoice.currency})`, COL.amtR, state.y - 8, 8, bold, MUTED);
    state.y -= 12;
    rule(state.y, 0.7);
    state.y -= 8;
  };
  drawTableHeader();

  if (data.lines.length === 0) {
    draw("No line items.", COL.desc, state.y - 9, 9, font, MUTED);
    state.y -= 16;
  }

  for (const line of data.lines) {
    const descLines = wrap(line.description, 9, font, COL.descWidth);
    const rowHeight = descLines.length * 12 + (line.discountLabel ? 11 : 0) + 6;
    if (ensure(rowHeight)) drawTableHeader();

    const cellY = state.y;
    let rowY = state.y;
    for (const dl of descLines) {
      draw(dl, COL.desc, rowY - 9, 9, font);
      rowY -= 12;
    }
    if (line.discountLabel) {
      draw(`Discount ${line.discountLabel}`, COL.desc, rowY - 8, 8, font, MUTED);
      rowY -= 11;
    }
    drawRight(`${line.quantity} ${line.unit}`, COL.qtyR, cellY - 9, 9, font);
    drawRight(formatPdfNumber(line.unitPriceCents), COL.priceR, cellY - 9, 9, font);
    drawRight(line.vatLabel, COL.vatR, cellY - 9, 9, font);
    drawRight(formatPdfNumber(line.lineTotalCents), COL.amtR, cellY - 9, 9, font);

    state.y = rowY - 6;
    rule(state.y + 2, 0.3);
  }

  // ---- Totals ----
  const totalsLabelX = 350;
  const totalRows: Array<[string, string]> = [
    ["Subtotal (excl. VAT)", formatPdfAmount(data.totals.subtotalCents, data.invoice.currency)],
  ];
  for (const group of data.vatBreakdown) {
    totalRows.push([
      group.reverseCharge ? "Reverse charge" : `VAT ${group.label}`,
      group.reverseCharge ? "—" : formatPdfAmount(group.vatCents, data.invoice.currency),
    ]);
  }
  totalRows.push(["VAT total", formatPdfAmount(data.totals.vatTotalCents, data.invoice.currency)]);

  ensure(totalRows.length * 14 + 40);
  state.y -= 10;
  for (const [k, v] of totalRows) {
    draw(k, totalsLabelX, state.y - 9, 9, font, MUTED);
    drawRight(v, RIGHT, state.y - 9, 9, font);
    state.y -= 14;
  }
  state.page.drawLine({
    start: { x: totalsLabelX, y: state.y },
    end: { x: RIGHT, y: state.y },
    thickness: 0.7,
    color: RULE,
  });
  state.y -= 6;
  draw("Total", totalsLabelX, state.y - 12, 12, bold);
  drawRight(
    formatPdfAmount(data.totals.grandTotalCents, data.invoice.currency),
    RIGHT,
    state.y - 12,
    12,
    bold,
  );
  state.y -= 24;

  // ---- Payment information ----
  const paymentDetails = compact(
    [
      data.company.iban && `IBAN ${data.company.iban}`,
      data.company.bic && `BIC ${data.company.bic}`,
      data.company.bankName,
    ],
    "   ",
  );
  if (paymentDetails || data.company.paymentTerms) {
    ensure(70);
    state.y -= 6;
    draw("PAYMENT", LEFT, state.y - 8, 8, bold, MUTED);
    state.y -= 14;
    const dueLine = `Please pay ${formatPdfAmount(data.totals.grandTotalCents, data.invoice.currency)} by ${formatPdfDate(data.invoice.dueDate)}.`;
    for (const l of [dueLine, paymentDetails, data.company.paymentTerms ?? ""].filter(Boolean)) {
      for (const wrapped of wrap(l, 9, font, RIGHT - LEFT)) {
        draw(wrapped, LEFT, state.y - 9, 9, font);
        state.y -= 12;
      }
    }
    state.y -= 8;
  }

  // ---- Notes ----
  if (data.invoice.notes && data.invoice.notes.trim()) {
    ensure(50);
    draw("NOTES", LEFT, state.y - 8, 8, bold, MUTED);
    state.y -= 13;
    for (const l of wrap(data.invoice.notes, 9, font, RIGHT - LEFT)) {
      ensure(12);
      draw(l, LEFT, state.y - 9, 9, font, MUTED);
      state.y -= 12;
    }
  }

  // ---- Footers (drawn last, once page count is known) ----
  const pages = doc.getPages();
  const footerLeft = compact(
    [data.invoice.number, data.company.legalName || data.company.name],
    " · ",
  );
  pages.forEach((page, index) => {
    page.drawText(sanitizePdfText(footerLeft), {
      x: LEFT,
      y: MARGIN - 12,
      size: 7.5,
      font,
      color: MUTED,
    });
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    page.drawText(pageLabel, {
      x: RIGHT - font.widthOfTextAtSize(pageLabel, 7.5),
      y: MARGIN - 12,
      size: 7.5,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}
