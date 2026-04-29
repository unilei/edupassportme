import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastChecked = new Date();

  // Get followed user IDs once
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const watchIds = [userId, ...follows.map((f) => f.followingId)];

  const stream = new ReadableStream({
    async start(controller) {
      const sendNewActivities = async () => {
        if (closed) return;
        try {
          const activities = await prisma.userActivity.findMany({
            where: {
              userId: { in: watchIds },
              createdAt: { gt: lastChecked },
            },
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          if (activities.length > 0) {
            lastChecked = new Date();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "new_activities", activities })}\n\n`),
            );
          }
        } catch {
          // ignore polling errors
        }
      };

      // Send initial event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", watchCount: watchIds.length })}\n\n`),
      );

      // Poll every 10 seconds for new activities
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        await sendNewActivities();
      }, 10_000);

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Cleanup stored for cancel
      (controller as unknown as Record<string, unknown>).__cleanup = () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
