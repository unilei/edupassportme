import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAccountType } from "@/lib/account-types";

// ---------------------------------------------------------------------------
// Standardised API error / success responses
// ---------------------------------------------------------------------------

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// ---------------------------------------------------------------------------
// Auth helpers — reduce boilerplate in every route
// ---------------------------------------------------------------------------

interface AuthResult {
  userId: string;
  isAdmin: boolean;
}

/**
 * Require a logged-in **user** (not the admin account).
 * Returns `{ userId }` or a 401 NextResponse.
 */
export async function requireUser(): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!userId || userId === "admin") {
    return apiError("Unauthorized", 401);
  }
  return { userId, isAdmin: false };
}

/**
 * Require a logged-in individual user for personal workspace APIs.
 * Organization and partner accounts must use their business/partner workflows.
 */
export async function requireIndividualUser(): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const userId = user?.id as string | undefined;
  if (!userId || userId === "admin") {
    return apiError("Unauthorized", 401);
  }
  if (getSessionAccountType(user) !== "individual") {
    return apiError("Individual account required", 403);
  }
  return { userId, isAdmin: false };
}

/**
 * Require the admin account.
 * Returns `{ userId: "admin", isAdmin: true }` or a 401 NextResponse.
 */
export async function requireAdmin(): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  if (user?.id !== "admin" || user?.role !== "admin") {
    return apiError("Unauthorized", 401);
  }
  return { userId: "admin", isAdmin: true };
}

/**
 * Type guard: check if the auth result is an error response.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 20) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
