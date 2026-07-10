import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/invoices/line-math";
import type { VatGroup } from "@/lib/invoices/totals";

/** Read-only VAT summary + totals for an invoice (from the persisted values). */
export function InvoiceTotalsSummary({
  subtotalCents,
  vatTotalCents,
  grandTotalCents,
  vatBreakdown,
  currency,
}: {
  subtotalCents: number;
  vatTotalCents: number;
  grandTotalCents: number;
  vatBreakdown: VatGroup[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="ml-auto flex max-w-sm flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
          <span>{formatMoney(subtotalCents, currency)}</span>
        </div>

        {vatBreakdown.map((group) => (
          <div key={group.key} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {group.reverseCharge ? "Reverse charge" : `VAT ${group.label}`}
              <span className="ml-1 text-xs">on {formatMoney(group.netCents, currency)}</span>
            </span>
            <span>{group.reverseCharge ? "—" : formatMoney(group.vatCents, currency)}</span>
          </div>
        ))}

        <div className="mt-1 flex justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">VAT total</span>
          <span>{formatMoney(vatTotalCents, currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(grandTotalCents, currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
