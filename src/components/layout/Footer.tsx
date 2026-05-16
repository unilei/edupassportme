import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";

const footerLinks = {
  Explore: [
    { href: "/search", label: "Search" },
    { href: "/courses", label: "Courses" },
    { href: "/jobs", label: "Jobs" },
    { href: "/events", label: "Events" },
    { href: "/deals", label: "Deals" },
  ],
  Resources: [
    { href: "/guide", label: "User Guide" },
    { href: "/workspace", label: "Workspace" },
    { href: "/submit-opportunity", label: "Submit Opportunity" },
    { href: "/deal-program", label: "Deal Program" },
    { href: "/pricing", label: "Pricing" },
    { href: "/business", label: "Business Workspace" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/sitemap.xml", label: "Sitemap" },
  ],
};

const socialLinks = [
  { href: "#", icon: Twitter, label: "Twitter" },
  { href: "#", icon: Linkedin, label: "LinkedIn" },
  { href: "#", icon: Github, label: "GitHub" },
  { href: "#", icon: Mail, label: "Email" },
];

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-b from-muted/30 to-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="group mb-4 inline-flex" aria-label="EDU Passport home">
              <BrandLogo textClassName="text-lg" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
              Find education opportunities across courses, jobs, events, and partner deals, then keep every next step moving in one workspace.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border bg-background hover:bg-accent hover:border-primary/20 transition-all duration-200 text-muted-foreground hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-sm mb-4 text-foreground">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Copyright &copy; {new Date().getFullYear()} EDU Passport. All Rights Reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/sitemap.xml" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
