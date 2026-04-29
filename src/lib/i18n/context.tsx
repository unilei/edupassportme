"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Locale } from "./index";
import { getMessages, t as translate } from "./index";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "edupassport-locale";
const COOKIE_NAME = "NEXT_LOCALE";

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/`;
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale = "en" }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      setCookie(COOKIE_NAME, newLocale, 365);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);
  const t = useCallback((key: string) => translate(messages, key), [messages]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for server components or outside provider
    const msgs = getMessages("en");
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      t: (key: string) => translate(msgs, key),
    };
  }
  return ctx;
}
