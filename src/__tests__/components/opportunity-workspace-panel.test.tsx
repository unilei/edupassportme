import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OpportunityWorkspacePanel } from "@/components/workspace/OpportunityWorkspacePanel";

vi.mock("@/components/listing/ListingCard", () => ({
  ListingCard: ({ listing }: { listing: { title: string } }) => <div>{listing.title}</div>,
}));

const entry = {
  id: "saved_1",
  createdAt: "2026-05-15T00:00:00.000Z",
  status: "saved",
  priority: "medium",
  note: null,
  deadlineAt: "2026-06-01T12:00:00.000Z",
  nextActionAt: "2026-05-20T09:30:00.000Z",
  listing: {
    id: "listing_1",
    slug: "data-science-internship-prep",
    title: "Data Science Internship Prep",
    type: "course" as const,
    description: "Build internship-ready skills.",
    url: "https://example.com",
    provider: { name: "EDU", slug: "edu", logo: null },
  },
};

describe("OpportunityWorkspacePanel", () => {
  it("renders tracking controls and updates saved opportunity metadata", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <OpportunityWorkspacePanel
        entries={[entry]}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole("heading", { name: "Opportunity Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Data Science Internship Prep")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status for Data Science Internship Prep"), "applying");
    await userEvent.selectOptions(screen.getByLabelText("Priority for Data Science Internship Prep"), "high");

    expect(onUpdate).toHaveBeenCalledWith("saved_1", { status: "applying" });
    expect(onUpdate).toHaveBeenCalledWith("saved_1", { priority: "high" });
  });
});
