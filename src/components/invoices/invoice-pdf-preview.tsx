"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Embeds the on-demand invoice PDF. "Regenerate" cache-busts the iframe so the
 * route re-renders the PDF from the current data; "Download" requests the
 * attachment variant.
 */
export function InvoicePdfPreview({ invoiceId }: { invoiceId: string }) {
  const [nonce, setNonce] = useState(0);
  const src = `/invoices/${invoiceId}/pdf?v=${nonce}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href={`/invoices/${invoiceId}/pdf?download=1`}>
            <Download />
            Download PDF
          </a>
        </Button>
        <Button variant="outline" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw />
          Regenerate
        </Button>
      </div>
      <iframe title="Invoice PDF preview" src={src} className="h-[80vh] w-full rounded-md border" />
    </div>
  );
}
