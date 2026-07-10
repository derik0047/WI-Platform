CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.updated';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.status_changed';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'invoice.deleted';--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"organization_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "invoice_counters_organization_id_year_pk" PRIMARY KEY("organization_id","year")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_org_number_unique" UNIQUE("organization_id","invoice_number")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "target_type" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "invoices_org_customer_idx" ON "invoices" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "invoices_org_issue_idx" ON "invoices" USING btree ("organization_id","issue_date","id");--> statement-breakpoint
CREATE INDEX "audit_log_org_target_idx" ON "audit_log" USING btree ("organization_id","target_type","target_id");