import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { Header } from "@/components/layout/Header";
import { I18nProvider } from "@/lib/i18n/context";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
  signOut: mocks.signOut,
  useSession: mocks.useSession,
}));

vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => null,
}));

describe("Header session state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
    mocks.signOut.mockResolvedValue(undefined);
  });

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

  it("uses an explicit redirecting logout contract", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          id: "user_1",
          email: "student@example.com",
          name: "Student",
          role: "user",
          tier: "free",
          accountType: "student",
        },
      },
    });

    render(
      <AuthSessionProvider>
        <I18nProvider initialLocale="en">
          <Header />
        </I18nProvider>
      </AuthSessionProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "User menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/", redirect: true });
  });
});
