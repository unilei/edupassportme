import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "@/components/layout/Header";
import { I18nProvider } from "@/lib/i18n/context";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signOut: mocks.signOut,
  useSession: mocks.useSession,
}));

vi.mock("@/components/layout/NotificationBell", () => ({
  NotificationBell: () => null,
}));

function renderHeader(accountType: "individual" | "organization" | "partner") {
  mocks.useSession.mockReturnValue({
    status: "authenticated",
    data: {
      user: {
        id: "user_1",
        email: `${accountType}@example.com`,
        name: accountType,
        role: "user",
        tier: "free",
        accountType,
      },
    },
  });

  render(
    <I18nProvider initialLocale="en">
      <Header />
    </I18nProvider>,
  );
}

async function openUserMenu() {
  await userEvent.click(screen.getByRole("button", { name: "User menu" }));
  return screen.getByRole("menu");
}

describe("Header account type navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows individual workflow links only for individual accounts", async () => {
    renderHeader("individual");
    const menu = await openUserMenu();

    expect(within(menu).getByText("Workspace")).toBeInTheDocument();
    expect(within(menu).getByText("For You")).toBeInTheDocument();
    expect(within(menu).getByText("Saved")).toBeInTheDocument();
    expect(within(menu).queryByText("Business")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Submit")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Deal Program")).not.toBeInTheDocument();
  });

  it("shows organization workflow links only for organization accounts", async () => {
    renderHeader("organization");
    const menu = await openUserMenu();

    expect(within(menu).getByText("Business")).toBeInTheDocument();
    expect(within(menu).getByText("Submit")).toBeInTheDocument();
    expect(within(menu).queryByText("Workspace")).not.toBeInTheDocument();
    expect(within(menu).queryByText("For You")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Deal Program")).not.toBeInTheDocument();
  });

  it("shows partner workflow links only for partner accounts", async () => {
    renderHeader("partner");
    const menu = await openUserMenu();

    expect(within(menu).getByText("Deal Program")).toBeInTheDocument();
    expect(within(menu).getByText("Business")).toBeInTheDocument();
    expect(within(menu).queryByText("Submit")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Workspace")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Saved")).not.toBeInTheDocument();
  });
});
