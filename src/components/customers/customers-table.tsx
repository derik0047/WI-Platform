"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { deleteCustomerAction, setCustomerStatusAction } from "@/app/(app)/customers/actions";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
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
import type { CustomerListItem } from "@/lib/data/customers";

export function CustomersTable({ items }: { items: CustomerListItem[] }) {
  const { pending, run } = useActionRunner();

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-10 text-center">
        <p className="text-muted-foreground text-sm">No customers match your filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">
                <Link href={`/customers/${customer.id}`} className="hover:underline">
                  {customer.companyName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.contactName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.city ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.country}</TableCell>
              <TableCell>
                <CustomerStatusBadge status={customer.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      aria-label={`Actions for ${customer.companyName}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/customers/${customer.id}`}>View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    {customer.status === "active" ? (
                      <DropdownMenuItem
                        onSelect={() => run(() => setCustomerStatusAction(customer.id, "archived"))}
                      >
                        Archive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => run(() => setCustomerStatusAction(customer.id, "active"))}
                      >
                        Restore
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() =>
                        run(() => deleteCustomerAction(customer.id), {
                          confirm: `Permanently delete ${customer.companyName}? This cannot be undone.`,
                        })
                      }
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
