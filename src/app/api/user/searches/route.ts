import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthError, requireIndividualUser } from "@/lib/api-utils";

// GET — list saved searches
export async function GET() {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ searches });
}

// POST — create a saved search
export async function POST(request: NextRequest) {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

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
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

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
