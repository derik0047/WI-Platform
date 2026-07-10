CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.line_added';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.line_updated';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.line_removed';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.line_reordered';--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"unit_price_cents" bigint DEFAULT 0 NOT NULL,
	"discount_type" "discount_type" DEFAULT 'percentage' NOT NULL,
	"discount_value" bigint DEFAULT 0 NOT NULL,
	"vat_rate_bp" integer DEFAULT 2100 NOT NULL,
	"subtotal_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_lines_org_idx" ON "invoice_lines" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_pos_idx" ON "invoice_lines" USING btree ("invoice_id","position","id");