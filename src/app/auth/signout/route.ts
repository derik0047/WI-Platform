import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/lib/auth";

/** Signs the current user out and returns them to /login. */
export async function POST(request: NextRequest) {
  await signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
