import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, newMatchTemplate, priceDropTemplate } from "@/lib/email";
import { Prisma } from "@/generated/prisma/client";
import { activeListingWhere } from "@/lib/listing-visibility";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { searchAlerts: 0, priceAlerts: 0, workspaceReminders: 0, errors: 0 };

  try {
    // -----------------------------------------------------------------------
    // 1. Saved Search alerts — find new listings matching each saved search
    // -----------------------------------------------------------------------
    const alertSearches = await prisma.savedSearch.findMany({
      where: { alertEnabled: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profile: { select: { notifyNewMatch: true } },
          },
        },
      },
    });

    for (const search of alertSearches) {
      if (!search.user.profile?.notifyNewMatch) continue;

      try {
        const filters = search.filters as Record<string, string>;
        const since = search.lastAlertAt || search.createdAt;
        // Build a dynamic where clause from the saved search filters
        const where: Prisma.ListingWhereInput = {
          ...activeListingWhere(),
          createdAt: { gt: since },
        };

        if (search.query) {
          where.AND = [
            ...(where.AND as Prisma.ListingWhereInput[]),
            {
              OR: [
                { title: { contains: search.query, mode: "insensitive" } },
                { description: { contains: search.query, mode: "insensitive" } },
              ],
            },
          ];
        }
        if (filters.type) where.type = filters.type as Prisma.ListingWhereInput["type"];
        if (filters.category) where.category = { slug: filters.category };
        if (filters.provider) where.provider = { slug: filters.provider };
        if (filters.level) where.level = filters.level;

        const newListings = await prisma.listing.findMany({
          where,
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { title: true, slug: true, type: true },
        });

        if (newListings.length === 0) continue;

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: search.user.id,
            type: "new_match",
            title: `${newListings.length} new match${newListings.length > 1 ? "es" : ""} for "${search.name}"`,
            body: newListings.map((l) => l.title).join(", "),
            link: "/saved",
            emailSent: true,
          },
        });

        // Send email
        const template = newMatchTemplate(search.user.name || "", search.name, newListings);
        await sendMail({ to: search.user.email, ...template });

        // Update lastAlertAt
        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastAlertAt: new Date() },
        });

        results.searchAlerts++;
      } catch (err) {
        console.error(`[Notify] Error processing search ${search.id}:`, err);
        results.errors++;
      }
    }

    // -----------------------------------------------------------------------
    // 2. Price drop alerts — check saved listings for price decreases
    // -----------------------------------------------------------------------
    const savedListings = await prisma.savedListing.findMany({
      where: { listing: activeListingWhere() },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profile: { select: { notifyPriceDrop: true } },
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            priceHistory: {
              orderBy: { recordedAt: "desc" },
              take: 2,
            },
          },
        },
      },
    });

    for (const saved of savedListings) {
      if (!saved.user.profile?.notifyPriceDrop) continue;
      if (!saved.listing.price) continue;

      const history = saved.listing.priceHistory;
      if (history.length < 2) continue;

      const currentPrice = history[0].price;
      const previousPrice = history[1].price;

      if (currentPrice >= previousPrice) continue;

      // Check if we already notified about this price
      const existing = await prisma.notification.findFirst({
        where: {
          userId: saved.user.id,
          type: "price_drop",
          link: `/listing/${saved.listing.slug}`,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (existing) continue;

      try {
        // Create in-app notification
        const savings = ((1 - currentPrice / previousPrice) * 100).toFixed(0);
        await prisma.notification.create({
          data: {
            userId: saved.user.id,
            type: "price_drop",
            title: `Price drop on ${saved.listing.title}`,
            body: `Price dropped ${savings}% from ${saved.listing.currency} ${previousPrice} to ${saved.listing.currency} ${currentPrice}`,
            link: `/listing/${saved.listing.slug}`,
            emailSent: true,
          },
        });

        // Send email
        const template = priceDropTemplate(saved.user.name || "", {
          title: saved.listing.title,
          slug: saved.listing.slug,
          oldPrice: previousPrice,
          newPrice: currentPrice,
          currency: saved.listing.currency,
        });
        await sendMail({ to: saved.user.email, ...template });

        results.priceAlerts++;
      } catch (err) {
        console.error(`[Notify] Error processing price drop for listing ${saved.listing.id}:`, err);
        results.errors++;
      }
    }

    // -----------------------------------------------------------------------
    // 3. Workspace reminders — saved opportunities with due next actions/deadlines
    // -----------------------------------------------------------------------
    const now = new Date();
    const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminderLookback = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const trackedOpportunities = await prisma.savedListing.findMany({
      where: {
        status: { in: ["saved", "researching", "applying", "applied"] },
        listing: activeListingWhere(now),
        OR: [
          { nextActionAt: { gte: now, lte: reminderWindowEnd } },
          { deadlineAt: { gte: now, lte: reminderWindowEnd } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: { select: { notifyNewMatch: true } },
          },
        },
        listing: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    for (const saved of trackedOpportunities) {
      if (!saved.user.profile?.notifyNewMatch) continue;

      const link = `/workspace?item=${saved.id}`;
      const existing = await prisma.notification.findFirst({
        where: {
          userId: saved.user.id,
          type: "opportunity_reminder",
          link,
          createdAt: { gt: reminderLookback },
        },
      });
      if (existing) continue;

      const isNextActionDue = Boolean(saved.nextActionAt && saved.nextActionAt <= reminderWindowEnd);
      const title = isNextActionDue
        ? `Next action due for ${saved.listing.title}`
        : `Deadline coming up for ${saved.listing.title}`;
      const dueAt = isNextActionDue ? saved.nextActionAt : saved.deadlineAt;
      const body = dueAt
        ? `${saved.listing.title} needs attention by ${dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
        : `${saved.listing.title} needs attention soon.`;

      try {
        await prisma.notification.create({
          data: {
            userId: saved.user.id,
            type: "opportunity_reminder",
            title,
            body,
            link,
            emailSent: false,
          },
        });
        results.workspaceReminders++;
      } catch (err) {
        console.error(`[Notify] Error creating workspace reminder for saved listing ${saved.id}:`, err);
        results.errors++;
      }
    }

    console.log("[Cron Notify]", JSON.stringify(results));
    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    console.error("[Cron Notify] Fatal error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
