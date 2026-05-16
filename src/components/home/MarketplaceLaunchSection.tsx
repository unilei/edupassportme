import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Handshake,
  Target,
} from "lucide-react";

const audienceCards = [
  {
    title: "Individual Workspace",
    description: "Save courses, jobs, events, and deals, then track status, priority, deadlines, and next actions.",
    href: "/workspace",
    cta: "Track in Workspace",
    icon: Target,
  },
  {
    title: "Submit Opportunities",
    description: "Education programs, employers, communities, and creators can send opportunities into review.",
    href: "/submit-opportunity",
    cta: "Submit for Review",
    icon: FileText,
  },
  {
    title: "Business Workspace",
    description: "Organization owners can monitor submitted listings, approved opportunities, and candidate interest.",
    href: "/business",
    cta: "Open Business Tools",
    icon: Building2,
  },
  {
    title: "Deal Program",
    description: "Partners can apply to publish education and career offers and manage their application status.",
    href: "/deal-program",
    cta: "Apply to Partner",
    icon: Handshake,
  },
] as const;

const workflowSteps = [
  {
    label: "Personal fit",
    text: "Recommendations explain why an opportunity matches.",
    icon: Target,
  },
  {
    label: "Next action",
    text: "Set a deadline or reminder as soon as you save.",
    icon: CalendarClock,
  },
  {
    label: "Track progress",
    text: "Move opportunities from saved to applied or completed.",
    icon: CheckCircle2,
  },
] as const;

export function MarketplaceLaunchSection() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Target className="h-3.5 w-3.5" />
              Marketplace launch
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              The new EDU Passport connects opportunity discovery with real execution.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Individuals get a focused workspace for next steps. Organizations can submit opportunities. Partners can apply to
              publish education and career deals. Admin keeps marketplace quality under review.
            </p>
          </div>
          <Link
            href="/business"
            className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Business Workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {audienceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-xl border bg-background p-5 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">{card.description}</p>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
