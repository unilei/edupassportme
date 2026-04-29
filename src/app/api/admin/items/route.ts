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
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  await requireAuth();
  const data = await request.json();

  const item = await prisma.item.create({
    data: {
      name: data.name,
      slug: data.slug,
      url: data.url,
      description: data.description,
      content: data.content || null,
      icon: data.icon || null,
      screenshot: data.screenshot || null,
      featured: data.featured || false,
      sortOrder: data.sortOrder || 0,
      categoryId: data.categoryId,
      tags: {
        create: (data.tagIds as string[] || []).map((tagId: string) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/category/${data.categorySlug}`);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  await requireAuth();
  const data = await request.json();

  // Remove existing tag connections
  await prisma.itemTag.deleteMany({ where: { itemId: data.id } });

  const item = await prisma.item.update({
    where: { id: data.id },
    data: {
      name: data.name,
      slug: data.slug,
      url: data.url,
      description: data.description,
      content: data.content || null,
      icon: data.icon || null,
      screenshot: data.screenshot || null,
      featured: data.featured || false,
      sortOrder: data.sortOrder || 0,
      categoryId: data.categoryId,
      tags: {
        create: (data.tagIds as string[] || []).map((tagId: string) => ({
          tag: { connect: { id: tagId } },
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/item/${item.slug}`);
  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const item = await prisma.item.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath(`/item/${item.slug}`);
  return NextResponse.json({ deleted: true });
}
