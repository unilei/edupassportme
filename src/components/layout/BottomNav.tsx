"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, Handshake, Heart, Home, Search, Send, Sparkles, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";
import { getSessionAccountType } from "@/lib/account-types";

const individualNavItems = [
  { href: "/", icon: Home, key: "home" },
  { href: "/search", icon: Search, key: "search" },
  { href: "/for-you", icon: Sparkles, key: "nav.forYou" },
  { href: "/saved", icon: Heart, key: "nav.saved" },
  { href: "/profile", icon: User, key: "nav.profile" },
] as const;

const organizationNavItems = [
  { href: "/", icon: Home, key: "home" },
  { href: "/search", icon: Search, key: "search" },
  { href: "/business", icon: Building2, key: "nav.business" },
  { href: "/submit-opportunity", icon: Send, key: "nav.submitOpportunity" },
  { href: "/profile", icon: User, key: "nav.profile" },
] as const;

const partnerNavItems = [
  { href: "/", icon: Home, key: "home" },
  { href: "/search", icon: Search, key: "search" },
  { href: "/deal-program", icon: Handshake, key: "nav.dealProgram" },
  { href: "/business", icon: FileText, key: "nav.business" },
  { href: "/profile", icon: User, key: "nav.profile" },
] as const;

const labels: Record<string, string> = {
  home: "Home",
  search: "Search",
};

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";
  const accountType = getSessionAccountType(session?.user);

  // Last item links to profile if logged in, sign-in if not
  const profileHref = isUser ? "/profile" : "/auth/signin";
  const navItems = isUser && accountType === "organization"
    ? organizationNavItems
    : isUser && accountType === "partner"
      ? partnerNavItems
      : individualNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const href = item.key === "nav.profile" ? profileHref : item.href;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = labels[item.key] || t(item.key);

          return (
            <Link
              key={item.key}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-14 py-1 px-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
