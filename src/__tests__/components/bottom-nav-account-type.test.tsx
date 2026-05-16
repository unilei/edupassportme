import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/layout/BottomNav";
import { I18nProvider } from "@/lib/i18n/context";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

function renderBottomNav(accountType: "individual" | "organization" | "partner") {
  mocks.useSession.mockReturnValue({
    data: {
      user: {
        id: "user_1",
        accountType,
      },
    },
  });

  render(
    <I18nProvider initialLocale="en">
      <BottomNav />
    </I18nProvider>,
  );
}

describe("BottomNav account type navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePathname.mockReturnValue("/");
  });

  it("shows individual discovery links for individual accounts", () => {
    renderBottomNav("individual");

    expect(screen.getByRole("link", { name: /For You/i })).toHaveAttribute("href", "/for-you");
    expect(screen.getByRole("link", { name: /Saved/i })).toHaveAttribute("href", "/saved");
    expect(screen.queryByRole("link", { name: /Submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Deal Program/i })).not.toBeInTheDocument();
  });

  it("shows organization workflow links for organization accounts", () => {
    renderBottomNav("organization");

    expect(screen.getByRole("link", { name: /Business/i })).toHaveAttribute("href", "/business");
    expect(screen.getByRole("link", { name: /Submit/i })).toHaveAttribute("href", "/submit-opportunity");
    expect(screen.queryByRole("link", { name: /For You/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Saved/i })).not.toBeInTheDocument();
  });

  it("shows partner workflow links for partner accounts", () => {
    renderBottomNav("partner");

    expect(screen.getByRole("link", { name: /Deal Program/i })).toHaveAttribute("href", "/deal-program");
    expect(screen.getByRole("link", { name: /Business/i })).toHaveAttribute("href", "/business");
    expect(screen.queryByRole("link", { name: /For You/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Submit/i })).not.toBeInTheDocument();
  });
});
