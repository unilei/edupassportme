import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError, apiError, apiSuccess } from "@/lib/api-utils";

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { reviewId } = await context.params;

  const replies = await prisma.reply.findMany({
    where: { reviewId, parentId: null },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      children: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess({ replies });
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
  const { body: replyBody, parentId } = body as { body?: string; parentId?: string };

  if (!replyBody || replyBody.trim().length < 2) {
    return apiError("Reply body is required (min 2 chars)", 400);
  }

  if (parentId) {
    const parent = await prisma.reply.findUnique({ where: { id: parentId }, select: { reviewId: true } });
    if (!parent || parent.reviewId !== reviewId) {
      return apiError("Parent reply not found", 404);
    }
  }

  const reply = await prisma.reply.create({
    data: {
      reviewId,
      userId,
      parentId: parentId || null,
      body: replyBody.trim(),
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  return apiSuccess({ reply }, 201);
}
