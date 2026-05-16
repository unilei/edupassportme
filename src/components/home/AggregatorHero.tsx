"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, GraduationCap, Briefcase, Calendar, Tag, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const verticals = [
  { key: "courses", label: "Courses", icon: GraduationCap, placeholder: "Search courses, certificates, training..." },
  { key: "jobs", label: "Jobs", icon: Briefcase, placeholder: "Search education jobs, internships, roles..." },
  { key: "events", label: "Events", icon: Calendar, placeholder: "Search conferences, workshops, webinars..." },
  { key: "deals", label: "Deals", icon: Tag, placeholder: "Search partner deals, discounts, tools..." },
] as const;

export function AggregatorHero() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("courses");
  const [query, setQuery] = useState("");

  const current = verticals.find((v) => v.key === activeTab) ?? verticals[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = `/${activeTab}`;
    if (query.trim()) {
      router.push(`${base}?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(base);
    }
  };

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 gradient-hero" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.2_250_/_0.15),transparent_60%)]" />

      <div className="mx-auto max-w-4xl px-4 text-center relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
          <Sparkles className="h-4 w-4" />
          <span>Education Opportunity Marketplace</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
          Find education opportunities, then keep every next step moving.
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl mb-10 max-w-2xl mx-auto text-balance">
          Search courses, jobs, events, and partner deals, then save, apply, register, redeem, and track progress in one workspace.
        </p>

        {/* Vertical tabs */}
        <div className="flex justify-center gap-1 mb-5">
          {verticals.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setActiveTab(v.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === v.key
                    ? "bg-background text-primary border border-b-0 border-border shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 bg-background border border-border rounded-2xl p-3 shadow-xl shadow-primary/5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={current.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-12 text-base border-0 shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8 gradient-primary hover:opacity-90 transition-opacity">
            <Search className="h-4 w-4 mr-2" />
            Find
          </Button>
        </form>

        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/workspace">
            <Button size="lg" variant="outline" className="h-11 px-6">
              Open Workspace
            </Button>
          </Link>
          <Link href="/submit-opportunity">
            <Button size="lg" variant="ghost" className="h-11 px-6">
              Submit Opportunity
            </Button>
          </Link>
          <Link href="/deal-program">
            <Button size="lg" variant="ghost" className="h-11 px-6">
              Deal Program
            </Button>
          </Link>
        </div>

        {/* Popular searches */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="text-sm text-muted-foreground">Popular:</span>
          {["Teaching jobs", "Career events", "Education discounts", "Certificate courses"].map((term) => (
            <button
              key={term}
              onClick={() => { setQuery(term); router.push(`/search?q=${encodeURIComponent(term)}`); }}
              className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
