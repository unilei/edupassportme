"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { LayoutDashboard, FolderOpen, Globe, Tag, RefreshCw, LogOut, DollarSign, Megaphone, TrendingUp, Users, ShieldCheck, MessageSquare, ScrollText, Flag, CreditCard } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/items", label: "Items", icon: Globe },
  { href: "/admin/tags", label: "Tags", icon: Tag },
  { href: "/admin/sync", label: "Sync", icon: RefreshCw },
  { href: "/admin/sponsored", label: "Sponsored", icon: Megaphone },
  { href: "/admin/affiliates", label: "Affiliates", icon: DollarSign },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldCheck },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <a href="/admin/login" className="text-primary underline">
          Please sign in
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-60 shrink-0 border-r bg-muted/30 p-4 hidden md:block">
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
      <div className="flex-1 p-6 overflow-auto">{children}</div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
