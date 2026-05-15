import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerificationFindUnique = vi.fn();
const mockVerificationDelete = vi.fn();
const mockUserUpdate = vi.fn();
const mockNotificationCreate = vi.fn();
const mockSendMail = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findUnique: (...args: unknown[]) => mockVerificationFindUnique(...args),
      delete: (...args: unknown[]) => mockVerificationDelete(...args),
    },
    appUser: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendMail: (...args: unknown[]) => mockSendMail(...args),
  welcomeTemplate: vi.fn().mockReturnValue({ subject: "Welcome", html: "<p>welcome</p>" }),
}));

import { GET } from "@/app/api/auth/verify/route";

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ success: true });
  });

  it("returns a clear error when token is missing", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/auth/verify"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("TOKEN_REQUIRED");
  });

  it("returns a clear error for invalid tokens", async () => {
    mockVerificationFindUnique.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost:3000/api/auth/verify?token=bad"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_OR_EXPIRED_TOKEN");
  });

  it("deletes expired tokens and returns a clear expired-token error", async () => {
    mockVerificationFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      token: "expired",
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await GET(new NextRequest("http://localhost:3000/api/auth/verify?token=expired"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("TOKEN_EXPIRED");
    expect(mockVerificationDelete).toHaveBeenCalledWith({ where: { id: "token-1" } });
  });

  it("verifies the user, deletes the token, sends welcome email, and creates welcome notification", async () => {
    mockVerificationFindUnique.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      token: "good",
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockUserUpdate.mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User" });
    mockVerificationDelete.mockResolvedValue({});
    mockNotificationCreate.mockResolvedValue({});

    const res = await GET(new NextRequest("http://localhost:3000/api/auth/verify?token=good"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: true },
      select: { id: true, email: true, name: true },
    });
    expect(mockVerificationDelete).toHaveBeenCalledWith({ where: { id: "token-1" } });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@test.com" }));
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", type: "welcome" }),
    });
  });
});
