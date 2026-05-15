import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/auth/signin/page";

const signInMock = vi.fn();
const refreshMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => new URLSearchParams("callbackUrl=/workspace"),
}));

describe("SignInPage post-login navigation", () => {
  const originalLocation = window.location;
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
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
});
