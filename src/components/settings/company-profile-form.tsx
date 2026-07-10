"use client";

import { useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateCompanyProfileAction } from "@/app/(app)/settings/company/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  organizationProfileSchema,
  type OrganizationProfileFormValues,
} from "@/lib/validations/organization-profile";

const MAX_LOGO_FILE_BYTES = 256 * 1024;

type FieldName = keyof OrganizationProfileFormValues;
type TextField = { name: FieldName; label: string; full?: boolean; placeholder?: string };

const FIELDS: TextField[] = [
  {
    name: "legalName",
    label: "Legal / company name",
    full: true,
    placeholder: "Acme Holding B.V.",
  },
  { name: "addressLine", label: "Address", full: true },
  { name: "postalCode", label: "Postal code" },
  { name: "city", label: "City" },
  { name: "country", label: "Country" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone" },
  { name: "website", label: "Website" },
  { name: "kvkNumber", label: "KVK number" },
  { name: "vatNumber", label: "VAT number (BTW)" },
  { name: "iban", label: "IBAN" },
  { name: "bic", label: "BIC" },
  { name: "bankName", label: "Bank name" },
];

export function CompanyProfileForm({
  defaultValues,
  canManage,
}: {
  defaultValues: OrganizationProfileFormValues;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganizationProfileFormValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues,
  });

  const logoDataUrl = watch("logoDataUrl");
  const disabled = pending || !canManage;

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      toast.error("Use a PNG or JPEG image");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      toast.error("Logo must be 256 KB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setValue("logoDataUrl", String(reader.result), { shouldValidate: true, shouldDirty: true });
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  }

  function onSubmit(values: OrganizationProfileFormValues) {
    startTransition(async () => {
      const result = await updateCompanyProfileAction(values);
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
      <CardHeader>
        <CardTitle>Company details</CardTitle>
        <CardDescription>
          {canManage
            ? "Shown on invoice PDFs — company address, tax numbers, payment details and logo."
            : "Only owners and admins can edit the company profile."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div
                key={field.name}
                className={`flex flex-col gap-2 ${field.full ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  {...register(field.name)}
                />
                {errors[field.name] && (
                  <p className="text-destructive text-sm">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="paymentTerms">Payment terms</Label>
              <Textarea
                id="paymentTerms"
                rows={2}
                placeholder="Payable within 14 days to the account below."
                disabled={disabled}
                {...register("paymentTerms")}
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoDataUrl}
                    alt="Company logo"
                    className="bg-muted h-12 w-auto max-w-40 rounded border object-contain p-1"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">No logo</span>
                )}
                {canManage && (
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg"
                      disabled={disabled}
                      onChange={onLogoChange}
                      className="max-w-64"
                    />
                    {logoDataUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={() =>
                          setValue("logoDataUrl", "", { shouldValidate: true, shouldDirty: true })
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {errors.logoDataUrl && (
                <p className="text-destructive text-sm">{errors.logoDataUrl.message}</p>
              )}
            </div>
          </div>

          {canManage && (
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "Saving…" : "Save company profile"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
