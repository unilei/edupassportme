import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequired } from "@/components/auth/AuthRequired";
import { AccountTypeRequired, IndividualAccountRequired } from "@/components/auth/AccountTypeRequired";

const useSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

describe("AuthRequired", () => {
  it("shows a sign-in prompt with callbackUrl for logged-out users", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated" });

    render(
      <AuthRequired
        callbackUrl="/learning"
        title="Sign in to track your learning"
        description="Your progress is private."
      >
        <div>Private page</div>
      </AuthRequired>,
    );

    expect(screen.getByRole("heading", { name: "Sign in to track your learning" })).toBeInTheDocument();
    expect(screen.getByText("Your progress is private.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/auth/signin?callbackUrl=%2Flearning",
    );
    expect(screen.queryByText("Private page")).not.toBeInTheDocument();
  });

  it("renders children for authenticated users", () => {
    useSessionMock.mockReturnValue({ status: "authenticated" });

    render(
      <AuthRequired callbackUrl="/saved">
        <div>Private page</div>
      </AuthRequired>,
    );

    expect(screen.getByText("Private page")).toBeInTheDocument();
  });
});

describe("IndividualAccountRequired", () => {
  it("renders children for individual accounts", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          accountType: "individual",
          profile: { onboardingCompletedAt: "2026-05-16T00:00:00.000Z" },
        },
      },
    });

    render(
      <IndividualAccountRequired
        callbackUrl="/workspace"
        title="Sign in to open your workspace"
        description="Your workspace is private."
      >
        <div>Individual workspace</div>
      </IndividualAccountRequired>,
    );

    expect(screen.getByText("Individual workspace")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks organization accounts from individual-only pages", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { accountType: "organization" } },
    });

    render(
      <IndividualAccountRequired
        callbackUrl="/workspace"
        title="Sign in to open your workspace"
        description="Your workspace is private."
      >
        <div>Individual workspace</div>
      </IndividualAccountRequired>,
    );

    expect(screen.getByRole("heading", { name: "Individual account required" })).toBeInTheDocument();
    expect(screen.getByText(/This workspace is for individual accounts/i)).toBeInTheDocument();
    expect(screen.queryByText("Individual workspace")).not.toBeInTheDocument();
  });

  it("requires onboarding before rendering individual tools", async () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { accountType: "individual" } },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { profile: { onboardingCompletedAt: null } },
        profileCompletion: { onboardingCompleted: false },
      }),
    });

    render(
      <IndividualAccountRequired
        callbackUrl="/workspace"
        title="Sign in to open your workspace"
        description="Your workspace is private."
      >
        <div>Individual workspace</div>
      </IndividualAccountRequired>,
    );

    expect(await screen.findByRole("heading", { name: "Complete individual setup" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete setup" })).toHaveAttribute("href", "/onboarding");
    expect(screen.queryByText("Individual workspace")).not.toBeInTheDocument();
  });

  it("renders tools when the profile endpoint confirms onboarding", async () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { accountType: "individual" } },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { profile: { onboardingCompletedAt: "2026-05-16T00:00:00.000Z" } },
        profileCompletion: { onboardingCompleted: true },
      }),
    });

    render(
      <IndividualAccountRequired
        callbackUrl="/workspace"
        title="Sign in to open your workspace"
        description="Your workspace is private."
      >
        <div>Individual workspace</div>
      </IndividualAccountRequired>,
    );

    expect(await screen.findByText("Individual workspace")).toBeInTheDocument();
  });

  it("uses account-specific onboarding copy for organization tools", async () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { accountType: "organization" } },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { profile: { onboardingCompletedAt: null } },
        profileCompletion: { onboardingCompleted: false },
      }),
    });

    render(
      <AccountTypeRequired
        allowed={["organization"]}
        callbackUrl="/business"
        title="Sign in"
        description="Private"
        blockedTitle="Business account required"
        blockedDescription="Use an organization account."
        requireOnboarding
      >
        <div>Business workspace</div>
      </AccountTypeRequired>,
    );

    expect(await screen.findByRole("heading", { name: "Complete organization setup" })).toBeInTheDocument();
    expect(screen.queryByText("Business workspace")).not.toBeInTheDocument();
  });
});
