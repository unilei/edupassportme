import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUpPage from "@/app/auth/signup/page";

const fetchMock = vi.fn();

describe("SignUpPage account type selection", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("requires a user to choose the account identity before registration", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ requiresVerification: true }),
    });

    render(<SignUpPage />);

    expect(screen.getByRole("radio", { name: /Student/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Organization/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Partner/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /Organization/i }));
    await userEvent.type(screen.getByLabelText("Name"), "Campus Employer");
    await userEvent.type(screen.getByLabelText("Email"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      name: "Campus Employer",
      email: "owner@example.com",
      password: "password123",
      accountType: "organization",
    });
  });
});
