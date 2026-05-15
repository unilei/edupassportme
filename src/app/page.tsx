import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AggregatorHero } from "@/components/home/AggregatorHero";
import { StatsBar } from "@/components/home/StatsBar";
import { ListingCard } from "@/components/listing/ListingCard";
import { DealCard } from "@/components/home/DealCard";
import { ItemGrid } from "@/components/item/ItemGrid";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { ArrowRight, Sparkles, Target, CalendarClock, CheckCircle2 } from "lucide-react";
import { activeListingWhere } from "@/lib/listing-visibility";

export const dynamic = "force-dynamic";

const listingInclude = {
  provider: { select: { name: true, slug: true, logo: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
} as const;

async function HomeContent() {
  const activeListing = activeListingWhere();
  const [
    courseCount,
    jobCount,
    eventCount,
    dealCount,
    providerCount,
    featuredCourses,
    latestJobs,
    upcomingEvents,
    activeDeals,
    editorialPicks,
  ] = await Promise.all([
    prisma.listing.count({ where: { ...activeListing, type: "course" } }),
    prisma.listing.count({ where: { ...activeListing, type: "job" } }),
    prisma.listing.count({ where: { ...activeListing, type: "event" } }),
    prisma.deal.count({ where: { isActive: true } }),
    prisma.provider.count({ where: { isActive: true } }),
    prisma.listing.findMany({
      where: { ...activeListing, type: "course" },
      orderBy: { rating: "desc" },
      take: 4,
      include: listingInclude,
    }),
    prisma.listing.findMany({
      where: { ...activeListing, type: "job" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: listingInclude,
    }),
    prisma.listing.findMany({
      where: { ...activeListing, type: "event" },
      orderBy: { startDate: "asc" },
      take: 3,
      include: listingInclude,
    }),
    prisma.deal.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.item.findMany({
      where: { featured: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    }),
  ]);

  return (
    <>
      <AggregatorHero />

      <StatsBar
        courseCount={courseCount}
        jobCount={jobCount}
        eventCount={eventCount}
        dealCount={dealCount}
        providerCount={providerCount}
      />

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Target className="h-3.5 w-3.5" />
              Marketplace to workspace
            </div>
            <h2 className="text-2xl font-bold">Turn marketplace discovery into a focused opportunity workflow.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse learning, career, event, and partner opportunities, then use Workspace to track priority, status, deadlines, applications, and reminders.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/workspace" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Open Workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/saved" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-background">
                Manage Saved
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Target, label: "Personal fit", text: "Recommendations explain why an opportunity matches." },
              { icon: CalendarClock, label: "Next action", text: "Set a deadline or reminder as soon as you save." },
              { icon: CheckCircle2, label: "Track progress", text: "Move opportunities from saved to applied or completed." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Top-Rated Courses</h2>
            <p className="text-sm text-muted-foreground mt-1">Discover the most popular courses across platforms</p>
          </div>
          <Link href="/courses" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group">
            View all
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredCourses.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Hot Deals */}
      {activeDeals.length > 0 && (
        <section className="bg-gradient-to-b from-orange-500/5 via-orange-500/2 to-transparent border-y">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Hot Deals & Discounts</h2>
                <p className="text-sm text-muted-foreground mt-1">Save on your learning journey</p>
              </div>
              <Link href="/deals" className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors group">
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {activeDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Jobs & Upcoming Events — side by side */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Jobs */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Latest Education Jobs</h2>
                <p className="text-sm text-muted-foreground mt-1">Find your next opportunity</p>
              </div>
              <Link href="/jobs" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group">
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="space-y-4">
              {latestJobs.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Upcoming Events</h2>
                <p className="text-sm text-muted-foreground mt-1">Conferences, workshops, and more</p>
              </div>
              <Link href="/events" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group">
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Picks (curated directory) */}
      {editorialPicks.length > 0 && (
        <section className="bg-gradient-to-b from-primary/5 via-primary/2 to-transparent border-y">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3 border border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  <span>Curated by experts</span>
                </div>
                <h2 className="text-2xl font-bold">Editorial Picks</h2>
                <p className="text-sm text-muted-foreground mt-1">Hand-picked by the EDU Passport team</p>
              </div>
              <Link href="/search" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group">
                Browse directory
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <ItemGrid items={editorialPicks} />
          </div>
        </section>
      )}

      <NewsletterSection />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
