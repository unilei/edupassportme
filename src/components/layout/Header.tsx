"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Heart, Sparkles, User, LogOut, Crown, FileText, ChevronDown, Target, Building2, Handshake } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useState, useRef, useEffect } from "react";

const navKeys = [
  { href: "/courses", key: "nav.courses" },
  { href: "/jobs", key: "nav.jobs" },
  { href: "/events", key: "nav.events" },
  { href: "/deals", key: "nav.deals" },
  { href: "/category", key: "nav.directory" },
  { href: "/submit-opportunity", key: "nav.submitOpportunity" },
  { href: "/deal-program", key: "nav.dealProgram" },
];

function UserMenu() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status === "loading") return null;

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const isPro = userTier === "pro";
  const isUser = session && userId && userId !== "admin";

  if (!isUser) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/signin">
          <Button variant="ghost" size="sm" className="text-sm font-medium">{t("nav.signIn")}</Button>
        </Link>
        <Link href="/auth/signup">
          <Button size="sm" className="text-sm font-medium gradient-primary hover:opacity-90 transition-opacity">{t("nav.signUp")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-accent transition-all duration-200 border border-transparent hover:border-border"
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${isPro ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-primary/20 to-primary/10"}`}>
          {isPro ? <Crown className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-primary" />}
        </div>
        <span className="text-sm font-medium hidden sm:inline max-w-24 truncate">
          {session.user?.name || session.user?.email}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card/95 backdrop-blur-xl shadow-xl py-2 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          <div className="px-4 py-2 border-b mb-1">
            <p className="text-sm font-medium truncate">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
          </div>

          <Link
            href="/business"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <Building2 className="h-4 w-4 text-emerald-600" /> {t("nav.business")}
          </Link>
          <Link
            href="/workspace"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <Target className="h-4 w-4 text-primary" /> {t("nav.workspace")}
          </Link>
          <Link
            href="/for-you"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <Sparkles className="h-4 w-4 text-purple-500" /> {t("nav.forYou")}
          </Link>
          <Link
            href="/saved"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <Heart className="h-4 w-4 text-red-500" /> {t("nav.saved")}
          </Link>
          <Link
            href="/applications"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <FileText className="h-4 w-4 text-blue-500" /> {t("nav.applications")}
          </Link>
          <Link
            href="/deal-program"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <Handshake className="h-4 w-4 text-emerald-600" /> {t("nav.dealProgram")}
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors mx-1 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-primary" /> {t("nav.profile")}
          </Link>

          {!isPro && (
            <Link
              href="/pricing"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors mx-1 rounded-lg"
              onClick={() => setOpen(false)}
            >
              <Crown className="h-4 w-4" /> {t("nav.upgradeToPro")}
            </Link>
          )}

          <div className="border-t my-1" />
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false); }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left mx-1 rounded-lg"
          >
            <LogOut className="h-4 w-4" /> {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium">
      Skip to content
    </a>
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="group" aria-label="EDU Passport home">
            <BrandLogo textClassName="text-lg" />
          </Link>
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {navKeys.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg hover:bg-accent/80"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
          <div className="hidden sm:flex items-center gap-1 ml-1 pl-1 border-l">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-4 space-y-1">
          {navKeys.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t flex items-center gap-2 px-4">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
    </>
  );
}

export function Header() {
  return <HeaderInner />;
}
