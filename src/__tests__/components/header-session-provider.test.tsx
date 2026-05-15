import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { Header } from "@/components/layout/Header";
import { I18nProvider } from "@/lib/i18n/context";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

describe("Header session state", () => {
  it("uses the app-level SessionProvider instead of creating an isolated header session cache", () => {
    render(
      <AuthSessionProvider>
        <I18nProvider initialLocale="en">
          <Header />
        </I18nProvider>
      </AuthSessionProvider>,
    );

    expect(screen.getAllByTestId("session-provider")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "EDU Passport home" })).toBeInTheDocument();
  });
});
