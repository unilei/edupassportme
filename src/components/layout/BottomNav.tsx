"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Sparkles, Heart, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";

const navItems = [
  { href: "/", icon: Home, key: "home" },
  { href: "/search", icon: Search, key: "search" },
  { href: "/for-you", icon: Sparkles, key: "nav.forYou" },
  { href: "/saved", icon: Heart, key: "nav.saved" },
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

  // Last item links to profile if logged in, sign-in if not
  const profileHref = isUser ? "/profile" : "/auth/signin";

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
