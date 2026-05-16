import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AggregatorHero } from "@/components/home/AggregatorHero";
import { MarketplaceLaunchSection } from "@/components/home/MarketplaceLaunchSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("AggregatorHero marketplace positioning", () => {
  it("positions EDU Passport as an education opportunity marketplace", () => {
    render(<AggregatorHero />);

    expect(screen.getByText("Education Opportunity Marketplace")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Find education opportunities, then keep every next step moving.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Search courses, jobs, events, and partner deals, then save, apply, register, redeem, and track progress in one workspace.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Submit Opportunity" })).toHaveAttribute(
      "href",
      "/submit-opportunity",
    );
    expect(screen.getByRole("link", { name: "Deal Program" })).toHaveAttribute(
      "href",
      "/deal-program",
    );
  });

  it("surfaces the live marketplace paths on the homepage", () => {
    render(<MarketplaceLaunchSection />);

    expect(screen.getByText("Marketplace launch")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "The new EDU Passport connects opportunity discovery with real execution.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Track in Workspace/ })).toHaveAttribute(
      "href",
      "/workspace",
    );
    expect(screen.getByRole("link", { name: /Submit for Review/ })).toHaveAttribute(
      "href",
      "/submit-opportunity",
    );
    expect(screen.getByRole("link", { name: /Open Business Tools/ })).toHaveAttribute(
      "href",
      "/business",
    );
    expect(screen.getByRole("link", { name: /Apply to Partner/ })).toHaveAttribute(
      "href",
      "/deal-program",
    );
  });
});
