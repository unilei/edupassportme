import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
}

// GET — list saved searches
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ searches });
}

// POST — create a saved search
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, query, filters } = body as { name?: string; query?: string; filters?: Record<string, string> };

  if (!name) {
    return NextResponse.json({ error: "Search name is required" }, { status: 400 });
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId,
      name,
      query: query || null,
      filters: filters || {},
    },
  });

  return NextResponse.json({ search }, { status: 201 });
}

// DELETE — remove a saved search
export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Search ID required" }, { status: 400 });
  }

  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search || search.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
