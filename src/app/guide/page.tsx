import Link from "next/link";
import { Building2, Crown, GraduationCap, Handshake, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const guides = [
  {
    title: "Individual guide",
    icon: GraduationCap,
    steps: [
      "Create an Individual account and verify your email.",
      "Students, parents, educators, job seekers, and lifelong learners can use one workspace to save opportunities, track applications, and manage next steps.",
      "Use For You and search pages to find courses, jobs, events, and deals.",
      "Save opportunities, set deadline or next action dates, and track status in Workspace.",
      "Use Applications for job application progress and Learning for course progress.",
    ],
    cta: { href: "/workspace", label: "Open Workspace" },
  },
  {
    title: "Organization guide",
    icon: Building2,
    steps: [
      "Create an Organization account and verify your email.",
      "Submit jobs, events, courses, or public opportunities from Submit.",
      "Track review status, published listings, and applicant activity in Business.",
      "Use Business Listings to inspect live records and Business Applications to manage candidates.",
      "Contact EDU Passport if your posting limits or organization permissions need review.",
    ],
    cta: { href: "/submit-opportunity", label: "Submit opportunity" },
  },
  {
    title: "Partner guide",
    icon: Handshake,
    steps: [
      "Create a Partner account and verify your email.",
      "Use Deal Program to apply for education, career, sponsorship, or campaign partnerships.",
      "Track application review status and admin notes from the Deal Program page.",
      "After approval, use Business to monitor partner supply and published outcomes.",
      "Do not use the general Submit workflow for partner-only offers.",
    ],
    cta: { href: "/deal-program", label: "Open Deal Program" },
  },
  {
    title: "Admin guide",
    icon: ShieldCheck,
    steps: [
      "Review submitted opportunities, approve quality listings, and reject low-quality records.",
      "Manage organizations, Deal Program applications, sponsored placements, and user Pro status.",
      "Keep marketplace supply clean by checking expired, duplicate, or low-context listings.",
      "Use notifications, audit trails, and admin dashboards to validate operational changes.",
      "Keep Pro activation manual until payment infrastructure is ready.",
    ],
    cta: { href: "/admin", label: "Open Admin" },
  },
];

export default function UserGuidePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Crown className="h-3.5 w-3.5" />
          Product workflow
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">User Guide</h1>
        <p className="mt-3 text-muted-foreground">
          EDU Passport separates individual, organization, partner, and admin workflows so each account sees the tools that match its job.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => {
          const Icon = guide.icon;

          return (
            <section key={guide.title} className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{guide.title}</h2>
                  <p className="text-sm text-muted-foreground">Primary path and validation checklist.</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Button asChild variant="outline" className="mt-5">
                <Link href={guide.cta.href}>{guide.cta.label}</Link>
              </Button>
            </section>
          );
        })}
      </div>
    </main>
  );
}
