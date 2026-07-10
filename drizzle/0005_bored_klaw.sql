ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.totals_recalculated';--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN "reverse_charge" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_total_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "grand_total_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL;