import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthRequired } from "@/components/auth/AuthRequired";
import { IndividualAccountRequired } from "@/components/auth/AccountTypeRequired";

const useSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

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
      data: { user: { accountType: "individual" } },
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
});
