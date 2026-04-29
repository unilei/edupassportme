import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError, apiError, apiSuccess } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (isAuthError(auth)) return auth;
  const { userId } = auth;

  const body = await req.json();
  const { reviewId, replyId, reason, details } = body as {
    reviewId?: string;
    replyId?: string;
    reason?: string;
    details?: string;
  };

  if (!reviewId && !replyId) {
    return apiError("Must specify reviewId or replyId", 400);
  }

  const validReasons = ["spam", "harassment", "misinformation", "other"];
  if (!reason || !validReasons.includes(reason)) {
    return apiError("Invalid reason", 400);
  }

  // Check for duplicate report
  const existing = await prisma.report.findFirst({
    where: {
      userId,
      ...(reviewId ? { reviewId } : {}),
      ...(replyId ? { replyId } : {}),
    },
  });

  if (existing) {
    return apiError("You have already reported this", 409);
  }

  const report = await prisma.report.create({
    data: {
      userId,
      reviewId: reviewId || null,
      replyId: replyId || null,
      reason,
      details: details || null,
    },
  });

  return apiSuccess({ report }, 201);
}
