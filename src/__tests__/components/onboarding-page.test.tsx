import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  push: vi.fn(),
}));

const fetchMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("saves individual onboarding preferences and opens the individual workspace", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "user_1", accountType: "individual" } },
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            name: "Alex",
            accountType: "individual",
            profile: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, nextPath: "/workspace" }),
      });

    render(<OnboardingPage />);

    expect(await screen.findByRole("heading", { name: /Set up your individual workspace/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undergraduate" }));
    await userEvent.click(screen.getByRole("button", { name: "Data Science" }));
    await userEvent.click(screen.getByRole("button", { name: "Build a portfolio" }));
    await userEvent.click(screen.getByRole("button", { name: "Remote" }));
    await userEvent.click(screen.getByRole("button", { name: "Jobs" }));
    await userEvent.click(screen.getByRole("button", { name: /Finish setup/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      educationLevel: "Undergraduate",
      interests: ["Data Science"],
      goals: ["Build a portfolio"],
      targetRegions: ["Remote"],
      preferredTypes: ["job"],
      completeOnboarding: true,
    });
    expect(mocks.push).toHaveBeenCalledWith("/workspace");
  });

  it("saves organization onboarding and opens the business workspace", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "org_1", accountType: "organization" } },
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { name: "Campus Hiring", accountType: "organization", organizations: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, nextPath: "/business" }),
      });

    render(<OnboardingPage />);

    expect(await screen.findByRole("heading", { name: /Set up your organization workspace/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Organization name"), "Campus Hiring");
    await userEvent.type(screen.getByLabelText("Website"), "https://campus.example");
    await userEvent.selectOptions(screen.getByLabelText("Organization type"), "employer");
    await userEvent.type(screen.getByLabelText("Description"), "Early career listings and events.");
    await userEvent.click(screen.getByRole("button", { name: /Finish setup/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      organizationName: "Campus Hiring",
      organizationWebsite: "https://campus.example",
      organizationType: "employer",
      organizationDescription: "Early career listings and events.",
      completeOnboarding: true,
    });
    expect(mocks.push).toHaveBeenCalledWith("/business");
  });

  it("saves partner onboarding and opens the deal program", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "partner_1", accountType: "partner" } },
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { name: "Deals Team", accountType: "partner", organizations: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, nextPath: "/deal-program" }),
      });

    render(<OnboardingPage />);

    expect(await screen.findByRole("heading", { name: /Set up your partner workspace/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Organization name"), "Student Deals Co");
    await userEvent.type(screen.getByLabelText("Website"), "https://deals.example");
    await userEvent.type(screen.getByLabelText("Contact name"), "Pat Partner");
    await userEvent.type(screen.getByLabelText("Contact email"), "partners@deals.example");
    await userEvent.type(screen.getByLabelText("Proposed offer"), "20% off education purchases.");
    await userEvent.type(screen.getByLabelText("Target audience"), "US learners");
    await userEvent.click(screen.getByRole("button", { name: /Finish setup/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      organizationName: "Student Deals Co",
      organizationWebsite: "https://deals.example",
      contactName: "Pat Partner",
      contactEmail: "partners@deals.example",
      proposedOffer: "20% off education purchases.",
      targetAudience: "US learners",
      completeOnboarding: true,
    });
    expect(mocks.push).toHaveBeenCalledWith("/deal-program");
  });
});
