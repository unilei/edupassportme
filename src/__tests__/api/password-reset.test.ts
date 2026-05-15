import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockResetFindUnique = vi.fn();
const mockResetDelete = vi.fn();
const mockResetUpdate = vi.fn();
const mockCreatePasswordResetToken = vi.fn();
const mockSendMail = vi.fn();
const mockHash = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    passwordResetToken: {
      findUnique: (...args: unknown[]) => mockResetFindUnique(...args),
      delete: (...args: unknown[]) => mockResetDelete(...args),
      update: (...args: unknown[]) => mockResetUpdate(...args),
    },
  },
}));

vi.mock("@/lib/tokens", () => ({
  createPasswordResetToken: (...args: unknown[]) => mockCreatePasswordResetToken(...args),
}));

vi.mock("@/lib/email", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
  passwordResetTemplate: vi.fn().mockReturnValue({ subject: "Reset", html: "<p>reset</p>" }),
}));

vi.mock("bcryptjs", () => ({
  hash: (...args: unknown[]) => mockHash(...args),
}));

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";

function makeRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("password recovery APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePasswordResetToken.mockResolvedValue("reset-token");
    mockSendMail.mockResolvedValue({ success: true });
    mockHash.mockResolvedValue("hashed-new-password");
  });

  it("forgot-password stays enumeration-safe for unknown emails", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await forgotPassword(makeRequest("/api/auth/forgot-password", { email: "missing@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("If an account with that email exists");
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("reset-password returns a clear error for invalid tokens", async () => {
    mockResetFindUnique.mockResolvedValue(null);

    const res = await resetPassword(makeRequest("/api/auth/reset-password", { token: "bad", password: "newpass1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_OR_USED_TOKEN");
  });

  it("reset-password deletes expired tokens and returns a clear expired-token error", async () => {
    mockResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "expired",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    const res = await resetPassword(makeRequest("/api/auth/reset-password", { token: "expired", password: "newpass1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("TOKEN_EXPIRED");
    expect(mockResetDelete).toHaveBeenCalledWith({ where: { id: "reset-1" } });
  });

  it("reset-password updates the password and marks the token used", async () => {
    mockResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "good",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    mockUserUpdate.mockResolvedValue({});
    mockResetUpdate.mockResolvedValue({});

    const res = await resetPassword(makeRequest("/api/auth/reset-password", { token: "good", password: "newpass1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-new-password" },
    });
    expect(mockResetUpdate).toHaveBeenCalledWith({
      where: { id: "reset-1" },
      data: { usedAt: expect.any(Date) },
    });
  });
});
