import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("mock-token-123"),
}));

vi.mock("@/lib/email", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  emailVerificationTemplate: vi.fn().mockReturnValue({
    subject: "Verify",
    html: "<p>verify</p>",
  }),
}));

import { POST } from "@/app/api/auth/register/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "123456" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Email and password are required");
  });

  it("should return 400 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "test@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Email and password are required");
  });

  it("should return 400 when password is too short", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("at least 6 characters");
  });

  it("should return 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing", email: "test@test.com" });

    const res = await POST(makeRequest({ email: "test@test.com", password: "123456" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("already exists");
  });

  it("should return 400 when account type is invalid", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({
      email: "new@test.com",
      password: "123456",
      accountType: "admin",
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Choose a valid account type.");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should reject the retired student account type for new registrations", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({
      email: "new@test.com",
      password: "123456",
      accountType: "student",
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Choose a valid account type.");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should create an individual user and return 201 on success", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "new@test.com",
      name: "Test User",
      accountType: "individual",
    });

    const res = await POST(makeRequest({
      email: "new@test.com",
      password: "123456",
      name: "Test User",
      accountType: "individual",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.email).toBe("new@test.com");
    expect(body.user.accountType).toBe("individual");
    expect(body.requiresVerification).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountType: "individual",
      }),
    }));
  });

  it("should default missing account type to individual", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "new@test.com",
      name: "Test User",
      accountType: "individual",
    });

    const res = await POST(makeRequest({
      email: "new@test.com",
      password: "123456",
      name: "Test User",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.accountType).toBe("individual");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountType: "individual",
      }),
    }));
  });

  it("should create user and return 201 on success", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "new@test.com",
      name: "Test User",
      accountType: "organization",
    });

    const res = await POST(makeRequest({
      email: "new@test.com",
      password: "123456",
      name: "Test User",
      accountType: "organization",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.email).toBe("new@test.com");
    expect(body.user.accountType).toBe("organization");
    expect(body.requiresVerification).toBe(true);
    expect(body.message).toContain("Verification email sent");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        accountType: "organization",
      }),
    }));
  });
});
