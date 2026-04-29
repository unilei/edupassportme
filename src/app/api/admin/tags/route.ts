import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
}

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  await requireAuth();
  const data = await request.json();

  const tag = await prisma.tag.create({
    data: { name: data.name, slug: data.slug },
  });

  revalidatePath("/tag");
  return NextResponse.json(tag, { status: 201 });
}

export async function PUT(request: Request) {
  await requireAuth();
  const data = await request.json();

  const tag = await prisma.tag.update({
    where: { id: data.id },
    data: { name: data.name, slug: data.slug },
  });

  revalidatePath("/tag");
  revalidatePath(`/tag/${tag.slug}`);
  return NextResponse.json(tag);
}

export async function DELETE(request: Request) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.tag.delete({ where: { id } });

  revalidatePath("/tag");
  return NextResponse.json({ deleted: true });
}
