import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial unread count
      const sendUnreadCount = async () => {
        if (closed) return;
        try {
          const count = await prisma.notification.count({
            where: { userId, read: false },
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "unread_count", count })}\n\n`)
          );
        } catch {
          // ignore errors during polling
        }
      };

      // Send initial count immediately
      await sendUnreadCount();

      // Poll every 15 seconds for new notifications
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        await sendUnreadCount();
      }, 15_000);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Cleanup when stream is cancelled
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
      };

      // Store cleanup for cancel
      (controller as unknown as Record<string, unknown>).__cleanup = cleanup;
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
