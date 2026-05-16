import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveButton } from "@/components/listing/SaveButton";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

const fetchMock = vi.fn();

describe("SaveButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("blocks organization accounts before calling the personal saved API", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "org_1", accountType: "organization" } },
    });

    render(<SaveButton listingId="listing_1" />);

    await userEvent.click(screen.getByRole("button", { name: "Save opportunity" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Use an individual account to save opportunities." })).toBeInTheDocument();
    });
  });

  it("surfaces non-limit 403 errors returned by the saved API", async () => {
    mocks.useSession.mockReturnValue({
      status: "authenticated",
      data: { user: { id: "user_1", accountType: "individual" } },
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Individual account required" }),
    });

    render(<SaveButton listingId="listing_1" />);

    await userEvent.click(screen.getByRole("button", { name: "Save opportunity" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Individual account required" })).toBeInTheDocument();
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
