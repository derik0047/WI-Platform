import { NextResponse, type NextRequest } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import { createOrganization, listOrganizationsForUser, toOrgActor } from "@/lib/data/organizations";
import { ValidationError } from "@/lib/errors";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { firstIssueMessage } from "@/lib/zod";

/** List the authenticated user's organizations. */
export async function GET() {
  try {
    const user = await requireApiUser();
    const organizations = await listOrganizationsForUser(user.id);
    return NextResponse.json({ organizations });
  } catch (error) {
    return apiError(error);
  }
}

/** Create an organization owned by the authenticated user. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = createOrganizationSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(firstIssueMessage(parsed.error));

    const organization = await createOrganization(toOrgActor(user), parsed.data);
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
