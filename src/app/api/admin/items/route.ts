import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
