import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Verify the current request is from an authenticated admin.
 * Returns the session or null if not admin.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as
    | string
    | undefined;
  if (userId !== "admin") return null;
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
