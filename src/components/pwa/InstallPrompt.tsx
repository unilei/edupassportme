"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "edupassport-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const { locale } = useI18n();

  useEffect(() => {
    // Don't show if already dismissed recently (7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!visible) return null;

  const isZh = locale === "zh";

  return (
    <div className="fixed bottom-16 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border bg-card shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {isZh ? "安装 EDU Passport" : "Install EDU Passport"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isZh
                ? "添加到主屏幕，获得更快的访问体验"
                : "Add to your home screen for quick access"}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            {isZh ? "以后再说" : "Not now"}
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {isZh ? "安装" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
