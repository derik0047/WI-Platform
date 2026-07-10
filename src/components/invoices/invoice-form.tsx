"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createInvoiceAction, updateInvoiceAction } from "@/app/(app)/invoices/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/config/currencies";
import type { CustomerOption } from "@/lib/data/customers";
import { invoiceFormSchema, type InvoiceFormValues } from "@/lib/validations/invoice";

export function InvoiceForm({
  invoiceId,
  defaultValues,
  customers,
}: {
  invoiceId?: string;
  defaultValues: InvoiceFormValues;
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(invoiceId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  function onSubmit(values: InvoiceFormValues) {
    startTransition(async () => {
      // Create redirects on success; update returns a result.
      const result =
        isEdit && invoiceId
          ? await updateInvoiceAction(invoiceId, values)
          : await createInvoiceAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="customerId">Customer</Label>
              <NativeSelect id="customerId" disabled={pending} {...register("customerId")}>
                <option value="">Select a customer…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </NativeSelect>
              {errors.customerId && (
                <p className="text-destructive text-sm">{errors.customerId.message}</p>
              )}
              {customers.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No active customers yet — add a customer first.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" disabled={pending} {...register("issueDate")} />
              {errors.issueDate && (
                <p className="text-destructive text-sm">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" disabled={pending} {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-destructive text-sm">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Currency</Label>
              <NativeSelect id="currency" disabled={pending} {...register("currency")}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} disabled={pending} {...register("notes")} />
              {errors.notes && <p className="text-destructive text-sm">{errors.notes.message}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending || customers.length === 0}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
