import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      icon: data.icon || null,
      sortOrder: data.sortOrder || 0,
      groupName: data.groupName || "Default",
    },
  });

  revalidatePath("/");
  revalidatePath("/category");
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  const category = await prisma.category.update({
    where: { id: data.id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      icon: data.icon || null,
      sortOrder: data.sortOrder || 0,
      groupName: data.groupName || "Default",
    },
  });

  revalidatePath("/");
  revalidatePath("/category");
  revalidatePath(`/category/${category.slug}`);
  return NextResponse.json(category);
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

  await prisma.category.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/category");
  return NextResponse.json({ deleted: true });
}
