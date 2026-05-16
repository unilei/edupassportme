import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { jsonLdWebsite, SITE_NAME } from "@/lib/metadata";
import { I18nProvider } from "@/lib/i18n/context";
import { BottomNavWrapper } from "@/components/layout/BottomNavWrapper";
import { getServerLocale } from "@/lib/i18n/server";
import { ClientProviders } from "@/components/ClientProviders";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Education Opportunity Marketplace`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Find and manage education opportunities across courses, jobs, events, and student deals. Students track next steps while organizations submit listings and partner offers.",
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
  alternates: {
    languages: {
      en: `${siteUrl}/en`,
      zh: `${siteUrl}/zh`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthSessionProvider>
            <I18nProvider initialLocale={locale}>
              <div className="flex min-h-screen flex-col pb-14 md:pb-0">
                <Header />
                <main id="main-content" className="flex-1">{children}</main>
                <Footer />
                <BottomNavWrapper />
              </div>
            </I18nProvider>
          </AuthSessionProvider>
        </ThemeProvider>
        <ClientProviders />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdWebsite()),
          }}
        />
      </body>
    </html>
  );
}
