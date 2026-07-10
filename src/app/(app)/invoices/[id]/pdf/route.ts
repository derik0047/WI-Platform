import { NextResponse, type NextRequest } from "next/server";

import { z } from "zod";

import { apiError } from "@/lib/api/response";
import { requireActiveOrganization } from "@/lib/auth/org";
import { getInvoicePdfData } from "@/lib/data/invoice-pdf";
import { NotFoundError } from "@/lib/errors";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render-invoice-pdf";

// pdf-lib needs the Node runtime (not edge).
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Generate the invoice PDF on demand (always reflects the current data). */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  // Auth/redirect must propagate (do not catch NEXT_REDIRECT below).
  const { user, organization } = await requireActiveOrganization();

  try {
    if (!z.string().uuid().safeParse(id).success) {
      throw new NotFoundError("Invoice not found");
    }
    const data = await getInvoicePdfData(user.id, organization.id, id, new Date());
    const bytes = await renderInvoicePdf(data);

    const download = request.nextUrl.searchParams.get("download") === "1";
    const filename = `${data.invoice.number}.pdf`.replace(/[^\w.-]+/g, "_");

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        // Always regenerate; never cache a document with financial data.
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
