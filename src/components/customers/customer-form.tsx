"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCustomerAction, updateCustomerAction } from "@/app/(app)/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES } from "@/config/countries";
import { customerFormSchema, type CustomerFormValues } from "@/lib/validations/customer";

const SELECT_CLASS =
  "border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

export function CustomerForm({
  customerId,
  defaultValues,
}: {
  customerId?: string;
  defaultValues: CustomerFormValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(customerId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  function onSubmit(values: CustomerFormValues) {
    startTransition(async () => {
      // Create redirects on success; update returns a result.
      const result =
        isEdit && customerId
          ? await updateCustomerAction(customerId, values)
          : await createCustomerAction(values);
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
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" disabled={pending} autoFocus {...register("companyName")} />
              {errors.companyName && (
                <p className="text-destructive text-sm">{errors.companyName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactName">Contact person</Label>
              <Input id="contactName" disabled={pending} {...register("contactName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled={pending} {...register("email")} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" disabled={pending} {...register("phone")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                className={SELECT_CLASS}
                disabled={pending}
                {...register("country")}
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="addressLine">Address</Label>
              <Input id="addressLine" disabled={pending} {...register("addressLine")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" disabled={pending} {...register("postalCode")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" disabled={pending} {...register("city")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="kvkNumber">KVK number</Label>
              <Input
                id="kvkNumber"
                placeholder="12345678"
                disabled={pending}
                {...register("kvkNumber")}
              />
              {errors.kvkNumber && (
                <p className="text-destructive text-sm">{errors.kvkNumber.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vatNumber">VAT number (BTW)</Label>
              <Input
                id="vatNumber"
                placeholder="NL123456789B01"
                disabled={pending}
                {...register("vatNumber")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className={SELECT_CLASS}
                disabled={pending}
                {...register("status")}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} disabled={pending} {...register("notes")} />
              {errors.notes && <p className="text-destructive text-sm">{errors.notes.message}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
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
