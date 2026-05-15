import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockCreateVerificationToken = vi.fn();
const mockSendMail = vi.fn();
const mockEmailVerificationTemplate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/tokens", () => ({
  createVerificationToken: (...args: unknown[]) => mockCreateVerificationToken(...args),
}));

vi.mock("@/lib/email", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
  emailVerificationTemplate: (...args: unknown[]) => mockEmailVerificationTemplate(...args),
}));

import { POST } from "@/app/api/auth/resend-verification/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateVerificationToken.mockResolvedValue("new-token");
    mockEmailVerificationTemplate.mockReturnValue({ subject: "Verify", html: "<p>verify</p>" });
    mockSendMail.mockResolvedValue({ success: true });
  });

  it("requires an email address", async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("EMAIL_REQUIRED");
  });

  it("returns a generic success for unknown emails without sending mail", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "missing@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("If an unverified account exists");
    expect(mockCreateVerificationToken).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns generic success for already verified emails without sending mail", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "verified@test.com",
      name: "Verified",
      emailVerified: true,
    });

    const res = await POST(makeRequest({ email: "verified@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("If an unverified account exists");
    expect(mockCreateVerificationToken).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("creates a new verification token and sends mail for unverified accounts", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "new@test.com",
      name: "New User",
      emailVerified: false,
    });

    const res = await POST(makeRequest({ email: "new@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("If an unverified account exists");
    expect(mockCreateVerificationToken).toHaveBeenCalledWith("user-1");
    expect(mockEmailVerificationTemplate).toHaveBeenCalledWith("New User", "new-token");
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "new@test.com" }));
  });
});
