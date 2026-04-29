import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, providerId, offerId } = body as {
      listingId?: string;
      providerId?: string;
      offerId?: string;
    };

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    // Get user session if available
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
    const resolvedUserId = userId && userId !== "admin" ? userId : null;

    // Look up affiliate info from provider
    let affiliateTag: string | null = null;
    let commission: number | null = null;

    const targetProviderId = providerId || (await prisma.listing.findUnique({
      where: { id: listingId },
      select: { providerId: true },
    }))?.providerId;

    if (targetProviderId) {
      const provider = await prisma.provider.findUnique({
        where: { id: targetProviderId },
        select: { affiliateTag: true, commissionRate: true },
      });
      if (provider?.affiliateTag) {
        affiliateTag = provider.affiliateTag;
        commission = provider.commissionRate ?? null;
      }
    }

    await prisma.clickEvent.create({
      data: {
        listingId,
        userId: resolvedUserId,
        providerId: targetProviderId || null,
        offerId: offerId || null,
        affiliateTag,
        commission,
        referrer: request.headers.get("referer") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    // Increment click count on listing
    await prisma.listing.update({
      where: { id: listingId },
      data: { clickCount: { increment: 1 } },
    });

    // Increment sponsored click count if applicable
    await prisma.sponsoredListing.updateMany({
      where: { listingId, isActive: true },
      data: { clicks: { increment: 1 } },
    });

    // Build affiliate redirect URL
    let redirectUrl: string | null = null;
    if (offerId) {
      const offer = await prisma.listingOffer.findUnique({
        where: { id: offerId },
        select: { affiliateUrl: true, url: true },
      });
      redirectUrl = offer?.affiliateUrl || offer?.url || null;
    }

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (err) {
    console.error("[Click Error]", err);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
