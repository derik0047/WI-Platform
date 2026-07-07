import { NextResponse } from "next/server";

import { toAppError } from "@/lib/errors";

/** Map any thrown value to a JSON error response with the right status. */
export function apiError(error: unknown) {
  const appError = toAppError(error);
  return NextResponse.json(
    { error: { code: appError.code, message: appError.message } },
    { status: appError.status },
  );
}
