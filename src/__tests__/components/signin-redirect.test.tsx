import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/auth/signin/page";

const signInMock = vi.fn();
const refreshMock = vi.fn();
const pushMock = vi.fn();
const useSearchParamsMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

describe("SignInPage post-login navigation", () => {
  const originalLocation = window.location;
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams("callbackUrl=/workspace"));
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignMock,
      },
    });
  });

  it("uses a full navigation after successful sign-in so header session state reloads from the new cookie", async () => {
    signInMock.mockResolvedValue({ ok: true, error: null });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "student@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith("/workspace");
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("sends users without onboarding to the onboarding flow when no callback is provided", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(""));
    signInMock.mockResolvedValue({ ok: true, error: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          accountType: "organization",
          role: "user",
          profile: { onboardingCompletedAt: null },
        },
      }),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "org@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("sends completed partner users to the partner workspace when no callback is provided", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams(""));
    signInMock.mockResolvedValue({ ok: true, error: null });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          accountType: "partner",
          role: "user",
          profile: { onboardingCompletedAt: "2026-05-16T00:00:00.000Z" },
        },
      }),
    });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "partner@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith("/deal-program");
    });
  });
});
