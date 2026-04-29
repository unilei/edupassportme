import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError, apiError, apiSuccess } from "@/lib/api-utils";

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { reviewId } = await context.params;

  const auth = await requireUser();
  if (isAuthError(auth)) return auth;
  const { userId } = auth;

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) {
    return apiError("Review not found", 404);
  }

  const body = await req.json();
  const { value } = body as { value?: number };

  if (value !== 1 && value !== -1) {
    return apiError("Value must be 1 or -1", 400);
  }

  const existing = await prisma.reviewVote.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });

  if (existing) {
    if (existing.value === value) {
      // Same vote = remove it (toggle off)
      await prisma.reviewVote.delete({ where: { id: existing.id } });
      await updateHelpful(reviewId);
      return apiSuccess({ vote: null });
    }
    // Different vote = update
    await prisma.reviewVote.update({ where: { id: existing.id }, data: { value } });
    await updateHelpful(reviewId);
    return apiSuccess({ vote: value });
  }

  // New vote
  await prisma.reviewVote.create({ data: { reviewId, userId, value } });
  await updateHelpful(reviewId);

  return apiSuccess({ vote: value }, 201);
}

async function updateHelpful(reviewId: string) {
  const agg = await prisma.reviewVote.aggregate({
    where: { reviewId },
    _sum: { value: true },
  });
  await prisma.review.update({
    where: { id: reviewId },
    data: { helpful: agg._sum.value || 0 },
  });
}
