CREATE TABLE "organization_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"country" text,
	"email" text,
	"phone" text,
	"website" text,
	"kvk_number" text,
	"vat_number" text,
	"iban" text,
	"bic" text,
	"bank_name" text,
	"payment_terms" text,
	"logo_data_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;