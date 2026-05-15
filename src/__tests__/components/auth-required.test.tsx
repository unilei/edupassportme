import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthRequired } from "@/components/auth/AuthRequired";

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
