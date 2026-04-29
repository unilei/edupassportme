"use client";

import { useI18n } from "@/lib/i18n/context";
import { locales, localeLabels } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => {
        const idx = locales.indexOf(locale);
        const next = locales[(idx + 1) % locales.length];
        setLocale(next);
      }}
      className="flex items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors text-sm"
      aria-label="Switch language"
      title={localeLabels[locale]}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline text-xs font-medium">{localeLabels[locale]}</span>
    </button>
  );
}
