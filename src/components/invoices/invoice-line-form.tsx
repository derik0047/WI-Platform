"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createInvoiceLineAction,
  updateInvoiceLineAction,
} from "@/app/(app)/invoices/line-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_UNITS } from "@/config/units";
import { VAT_RATES } from "@/config/vat-rates";
import { invoiceLineFormSchema, type InvoiceLineFormValues } from "@/lib/validations/invoice-line";

export function InvoiceLineForm({
  invoiceId,
  currency,
  lineId,
  defaultValues,
  onDone,
  onCancel,
}: {
  invoiceId: string;
  currency: string;
  lineId?: string;
  defaultValues: InvoiceLineFormValues;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(lineId);
  const uid = lineId ?? "new";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvoiceLineFormValues>({
    resolver: zodResolver(invoiceLineFormSchema),
    defaultValues,
  });

  function onSubmit(values: InvoiceLineFormValues) {
    startTransition(async () => {
      const result =
        isEdit && lineId
          ? await updateInvoiceLineAction(invoiceId, lineId, values)
          : await createInvoiceLineAction(invoiceId, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      if (!isEdit) reset(defaultValues); // ready for the next line
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`desc-${uid}`}>Description</Label>
        <Input id={`desc-${uid}`} disabled={pending} {...register("description")} />
        {errors.description && (
          <p className="text-destructive text-xs">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`qty-${uid}`}>Quantity</Label>
          <Input
            id={`qty-${uid}`}
            inputMode="decimal"
            disabled={pending}
            {...register("quantity")}
          />
          {errors.quantity && <p className="text-destructive text-xs">{errors.quantity.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`unit-${uid}`}>Unit</Label>
          <Input id={`unit-${uid}`} list="line-units" disabled={pending} {...register("unit")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`price-${uid}`}>Unit price ({currency})</Label>
          <Input
            id={`price-${uid}`}
            inputMode="decimal"
            disabled={pending}
            {...register("unitPrice")}
          />
          {errors.unitPrice && (
            <p className="text-destructive text-xs">{errors.unitPrice.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`vat-${uid}`}>VAT</Label>
          <NativeSelect id={`vat-${uid}`} disabled={pending} {...register("vatRateBp")}>
            {VAT_RATES.map((rate) => (
              <option key={rate.bp} value={rate.bp}>
                {rate.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`dtype-${uid}`}>Discount type</Label>
          <NativeSelect id={`dtype-${uid}`} disabled={pending} {...register("discountType")}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed ({currency})</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`dval-${uid}`}>Discount value</Label>
          <Input
            id={`dval-${uid}`}
            inputMode="decimal"
            disabled={pending}
            {...register("discountValue")}
          />
          {errors.discountValue && (
            <p className="text-destructive text-xs">{errors.discountValue.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`rc-${uid}`}
          type="checkbox"
          className="border-input size-4 rounded"
          disabled={pending}
          {...register("reverseCharge")}
        />
        <Label htmlFor={`rc-${uid}`} className="font-normal">
          Reverse charge (VAT shifted to the customer)
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`notes-${uid}`}>Notes</Label>
        <Textarea id={`notes-${uid}`} rows={2} disabled={pending} {...register("notes")} />
      </div>

      <datalist id="line-units">
        {COMMON_UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save line" : "Add line"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
