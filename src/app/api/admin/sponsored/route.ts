import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sponsored = await prisma.sponsoredListing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { id: true, name: true, plan: true } },
      listing: {
        select: { title: true, slug: true, type: true, provider: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({ sponsored });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { listingId, position, budget, cpc, endDate, organizationId } = body as {
      listingId: string;
      position: string;
      budget?: number;
      cpc?: number;
      endDate?: string;
      organizationId?: string;
    };

    if (!listingId || !position) {
      return NextResponse.json({ error: "listingId and position required" }, { status: 400 });
    }

    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }
    }

    const sponsored = await prisma.sponsoredListing.create({
      data: {
        listingId,
        organizationId: organizationId || null,
        position,
        budget: budget ?? 0,
        cpc: cpc ?? null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ sponsored }, { status: 201 });
  } catch (err) {
    console.error("[Sponsored Error]", err);
    return NextResponse.json({ error: "Failed to create sponsored listing" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.sponsoredListing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
