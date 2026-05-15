import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type AdminSessionLike = { user?: Record<string, unknown> | null } | null | undefined;

export function isAdminSession(session: AdminSessionLike) {
  const user = session?.user;
  return user?.id === "admin" && user?.role === "admin";
}

/**
 * Verify the current request is from an authenticated admin.
 * Returns the session or null if not admin.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) return null;
  return session;
}

/**
 * Write an entry to the audit log.
 */
export async function auditLog(
  actor: string,
  action: string,
  target?: string,
  details?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actor,
      action,
      target,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
