import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockCompare = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

import { authOptions } from "@/lib/auth";

type TestCredentialsProvider = {
  options?: {
    id?: string;
    authorize?: (credentials: { email?: string; password?: string }) => Promise<unknown>;
  };
};

const userLoginProvider = authOptions.providers.find((provider) => {
  const credentialsProvider = provider as TestCredentialsProvider;
  return credentialsProvider.options?.id === "user-login";
}) as TestCredentialsProvider;

const authorize = userLoginProvider.options?.authorize;
const refreshJwt = authOptions.callbacks?.jwt;

describe("user-login credentials provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompare.mockResolvedValue(true);
  });

  it("rejects unverified accounts with a machine-readable error", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "new@test.com",
      passwordHash: "hash",
      name: "New User",
      role: "user",
      tier: "free",
      accountType: "individual",
      emailVerified: false,
      banned: false,
    });

    await expect(authorize?.({ email: "new@test.com", password: "password" }))
      .rejects.toThrow("UNVERIFIED_EMAIL");
  });

  it("continues to reject banned users", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      email: "banned@test.com",
      passwordHash: "hash",
      name: "Banned User",
      role: "user",
      tier: "free",
      accountType: "individual",
      emailVerified: true,
      banned: true,
    });

    await expect(authorize?.({ email: "banned@test.com", password: "password" }))
      .rejects.toThrow("ACCOUNT_BANNED");
  });

  it("refreshes role and tier from the database for existing sessions", async () => {
    mockFindUnique.mockResolvedValue({
      role: "pro",
      tier: "pro",
      accountType: "organization",
      banned: false,
    });

    const token = await refreshJwt?.({
      token: { userId: "user-1", role: "user", tier: "free" },
    } as never);

    expect(token).toMatchObject({ role: "pro", tier: "pro", accountType: "organization" });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { role: true, tier: true, accountType: true, banned: true },
    });
  });

  it("normalizes legacy student account types while refreshing sessions", async () => {
    mockFindUnique.mockResolvedValue({
      role: "user",
      tier: "free",
      accountType: "student",
      banned: false,
    });

    const token = await refreshJwt?.({
      token: { userId: "user-1", role: "user", tier: "free" },
    } as never);

    expect(token).toMatchObject({ role: "user", tier: "free", accountType: "individual" });
  });

  it("exposes account type on the session", async () => {
    const session = await authOptions.callbacks?.session?.({
      session: { user: { email: "owner@test.com" }, expires: "2026-05-17T00:00:00.000Z" },
      token: {
        userId: "user-1",
        role: "user",
        tier: "free",
        accountType: "partner",
      },
    } as never);

    expect(session?.user).toMatchObject({
      id: "user-1",
      role: "user",
      tier: "free",
      accountType: "partner",
    });
  });

  it("normalizes legacy student account type values on the session", async () => {
    const session = await authOptions.callbacks?.session?.({
      session: { user: { email: "owner@test.com" }, expires: "2026-05-17T00:00:00.000Z" },
      token: {
        userId: "user-1",
        role: "user",
        tier: "free",
        accountType: "student",
      },
    } as never);

    expect(session?.user).toMatchObject({
      id: "user-1",
      role: "user",
      tier: "free",
      accountType: "individual",
    });
  });
});
