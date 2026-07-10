"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { deleteInvoiceAction, setInvoiceStatusAction } from "@/app/(app)/invoices/actions";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { InvoiceListItem } from "@/lib/data/invoices";
import {
  isInvoiceEditable,
  isPastDue,
  nextInvoiceStatuses,
  statusActionLabel,
} from "@/lib/invoices/status";
import { cn } from "@/lib/utils";

export function InvoicesTable({ items, today }: { items: InvoiceListItem[]; today: string }) {
  const { pending, run } = useActionRunner();

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-10 text-center">
        <p className="text-muted-foreground text-sm">No invoices match your filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((invoice) => {
            const editable = isInvoiceEditable(invoice.status);
            const overdue = isPastDue(invoice.status, invoice.dueDate, today);
            const transitions = nextInvoiceStatuses(invoice.status);
            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{invoice.customerName}</TableCell>
                <TableCell className="text-muted-foreground">{invoice.issueDate}</TableCell>
                <TableCell className={cn(overdue ? "text-destructive" : "text-muted-foreground")}>
                  {invoice.dueDate}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`Actions for ${invoice.invoiceNumber}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/invoices/${invoice.id}`}>View</Link>
                      </DropdownMenuItem>
                      {editable && (
                        <DropdownMenuItem asChild>
                          <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                      )}
                      {transitions.length > 0 && <DropdownMenuSeparator />}
                      {transitions.map((to) => (
                        <DropdownMenuItem
                          key={to}
                          className={
                            to === "cancelled" ? "text-destructive focus:text-destructive" : ""
                          }
                          onSelect={() =>
                            run(() => setInvoiceStatusAction(invoice.id, to), {
                              confirm:
                                to === "cancelled"
                                  ? `Cancel ${invoice.invoiceNumber}? This can't be undone.`
                                  : undefined,
                            })
                          }
                        >
                          {statusActionLabel(to)}
                        </DropdownMenuItem>
                      ))}
                      {editable && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() =>
                              run(() => deleteInvoiceAction(invoice.id), {
                                confirm: `Delete draft ${invoice.invoiceNumber}? This can't be undone.`,
                              })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
