import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AggregatorHero } from "@/components/home/AggregatorHero";

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
  });
});
