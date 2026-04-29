"use client";

import dynamic from "next/dynamic";

const ServiceWorkerRegistrar = dynamic(
  () => import("@/components/pwa/ServiceWorkerRegistrar").then((m) => m.ServiceWorkerRegistrar),
  { ssr: false },
);
const InstallPrompt = dynamic(
  () => import("@/components/pwa/InstallPrompt").then((m) => m.InstallPrompt),
  { ssr: false },
);
const WebVitals = dynamic(
  () => import("@/components/shared/WebVitals").then((m) => m.WebVitals),
  { ssr: false },
);
const ChatAssistant = dynamic(
  () => import("@/components/ai/ChatAssistant").then((m) => m.ChatAssistant),
  { ssr: false },
);

export function ClientProviders() {
  return (
    <>
      <InstallPrompt />
      <ChatAssistant />
      <ServiceWorkerRegistrar />
      <WebVitals />
    </>
  );
}
