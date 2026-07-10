"use client";

import { deleteInvoiceAction, setInvoiceStatusAction } from "@/app/(app)/invoices/actions";
import { Button } from "@/components/ui/button";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { InvoiceStatus } from "@/lib/db/schema";
import { isInvoiceEditable, nextInvoiceStatuses, statusActionLabel } from "@/lib/invoices/status";

export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const { pending, run } = useActionRunner();
  const transitions = nextInvoiceStatuses(status);

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((to) => (
        <Button
          key={to}
          variant={to === "cancelled" ? "outline" : "default"}
          disabled={pending}
          onClick={() =>
            run(() => setInvoiceStatusAction(invoiceId, to), {
              confirm:
                to === "cancelled" ? "Cancel this invoice? This can't be undone." : undefined,
            })
          }
        >
          {statusActionLabel(to)}
        </Button>
      ))}
      {isInvoiceEditable(status) && (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(() => deleteInvoiceAction(invoiceId), {
              confirm: "Delete this draft invoice? This can't be undone.",
            })
          }
        >
          Delete
        </Button>
      )}
    </div>
  );
}
