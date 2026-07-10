"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, MoreHorizontal } from "lucide-react";

import {
  deleteInvoiceLineAction,
  duplicateInvoiceLineAction,
  reorderInvoiceLinesAction,
} from "@/app/(app)/invoices/line-actions";
import { InvoiceLineForm } from "@/components/invoices/invoice-line-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { vatRateLabel } from "@/config/vat-rates";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { InvoiceLine } from "@/lib/db/schema";
import { emptyLineForm, lineToFormValues } from "@/lib/invoices/line-form";
import { basisPointsToPercentString, formatMoney, move } from "@/lib/invoices/line-math";
import { cn } from "@/lib/utils";

function discountLabel(line: InvoiceLine, currency: string): string | null {
  if (line.discountValue <= 0) return null;
  if (line.discountType === "percentage") {
    return `−${basisPointsToPercentString(line.discountValue)}%`;
  }
  // Show the effective (applied, clamped-to-subtotal) amount, not the raw value,
  // so the pill stays consistent with the struck subtotal/total shown alongside.
  const effective = line.subtotalCents - line.totalCents;
  return effective > 0 ? `−${formatMoney(effective, currency)}` : null;
}

export function InvoiceLinesEditor({
  invoiceId,
  currency,
  lines,
  canEdit,
}: {
  invoiceId: string;
  currency: string;
  lines: InvoiceLine[];
  canEdit: boolean;
}) {
  const { pending, run } = useActionRunner();
  const [order, setOrder] = useState(lines);
  const orderRef = useRef(lines);
  const dragIndex = useRef<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Keep local order in sync with the server after any refresh.
  useEffect(() => {
    orderRef.current = lines;
    setOrder(lines);
  }, [lines]);

  function persistOrder(next: InvoiceLine[]) {
    const ids = next.map((line) => line.id);
    if (ids.join("|") === lines.map((line) => line.id).join("|")) return;
    run(() => reorderInvoiceLinesAction(invoiceId, ids), {
      // On failure (e.g. the invoice left draft, or the set changed) revert the
      // optimistic order to the authoritative server order.
      onError: () => {
        orderRef.current = lines;
        setOrder(lines);
      },
    });
  }

  function reorderLocal(to: number) {
    const from = dragIndex.current;
    if (from === null || from === to) return;
    const next = move(orderRef.current, from, to);
    orderRef.current = next;
    setOrder(next);
    dragIndex.current = to;
  }

  function onDragEnd() {
    const dragged = dragIndex.current !== null;
    dragIndex.current = null;
    if (dragged) persistOrder(orderRef.current);
  }

  function moveBy(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= order.length) return;
    const next = move(order, index, to);
    orderRef.current = next;
    setOrder(next);
    persistOrder(next);
  }

  const draggable = canEdit && editingId === null && !adding && !pending;

  return (
    <div className="flex flex-col">
      {order.length === 0 && !adding && (
        <p className="text-muted-foreground py-6 text-center text-sm">No line items yet.</p>
      )}

      <ul className="flex flex-col">
        {order.map((line, index) => {
          if (editingId === line.id) {
            return (
              <li key={line.id} className="py-2">
                <InvoiceLineForm
                  invoiceId={invoiceId}
                  currency={currency}
                  lineId={line.id}
                  defaultValues={lineToFormValues(line)}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            );
          }

          const discount = discountLabel(line, currency);
          return (
            <li
              key={line.id}
              draggable={draggable}
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragEnter={() => reorderLocal(index)}
              onDragOver={(event) => {
                if (draggable) event.preventDefault();
              }}
              onDragEnd={onDragEnd}
              className={cn("flex items-center gap-3 border-b py-3", draggable && "cursor-grab")}
            >
              {canEdit && (
                <GripVertical className="text-muted-foreground size-4 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.description}</p>
                <p className="text-muted-foreground text-xs">
                  {line.quantity} {line.unit} × {formatMoney(line.unitPriceCents, currency)} ·{" "}
                  {line.reverseCharge ? "Reverse charge" : `VAT ${vatRateLabel(line.vatRateBp)}`}
                  {discount ? ` · ${discount}` : ""}
                </p>
                {line.notes && (
                  <p className="text-muted-foreground truncate text-xs italic">{line.notes}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium">{formatMoney(line.totalCents, currency)}</p>
                {line.subtotalCents !== line.totalCents && (
                  <p className="text-muted-foreground text-xs line-through">
                    {formatMoney(line.subtotalCents, currency)}
                  </p>
                )}
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      aria-label={`Actions for ${line.description}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setAdding(false);
                        setEditingId(line.id);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => run(() => duplicateInvoiceLineAction(invoiceId, line.id))}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={index === 0} onSelect={() => moveBy(index, -1)}>
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={index === order.length - 1}
                      onSelect={() => moveBy(index, 1)}
                    >
                      Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() =>
                        run(() => deleteInvoiceLineAction(invoiceId, line.id), {
                          confirm: `Remove "${line.description}"?`,
                        })
                      }
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <div className="pt-3">
          {adding ? (
            <InvoiceLineForm
              invoiceId={invoiceId}
              currency={currency}
              defaultValues={emptyLineForm()}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={pending || editingId !== null}
              onClick={() => setAdding(true)}
            >
              Add line
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
