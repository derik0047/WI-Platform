import { NextResponse, type NextRequest } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import {
  getOrganizationBySlug,
  requireMembership,
  updateOrganization,
} from "@/lib/data/organizations";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { updateOrganizationSchema } from "@/lib/validations/organization";
import { firstIssueMessage } from "@/lib/zod";

type RouteContext = { params: Promise<{ slug: string }> };

/** Get one organization the user is a member of. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { slug } = await params;
    const organization = await getOrganizationBySlug(slug);
    if (!organization) throw new NotFoundError("Organization not found");
    await requireMembership(user.id, organization.id);
    return NextResponse.json({ organization });
  } catch (error) {
    return apiError(error);
  }
}

/** Update an organization (owners/admins only). */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser();
    const { slug } = await params;
    const organization = await getOrganizationBySlug(slug);
    if (!organization) throw new NotFoundError("Organization not found");

    const body: unknown = await request.json().catch(() => null);
    const parsed = updateOrganizationSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(firstIssueMessage(parsed.error));

    const updated = await updateOrganization(user.id, organization.id, parsed.data);
    return NextResponse.json({ organization: updated });
  } catch (error) {
    return apiError(error);
  }
}
