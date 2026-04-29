import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockFollowFindMany = vi.fn();
const mockUserActivityFindMany = vi.fn();
const mockUserActivityCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follow: {
      findMany: (...args: unknown[]) => mockFollowFindMany(...args),
    },
    userActivity: {
      findMany: (...args: unknown[]) => mockUserActivityFindMany(...args),
      count: (...args: unknown[]) => mockUserActivityCount(...args),
    },
  },
}));

vi.mock("@/lib/api-utils", () => ({
  requireUser: vi.fn(),
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

import { GET } from "@/app/api/user/feed/route";
import { requireUser } from "@/lib/api-utils";

const mockRequireUser = vi.mocked(requireUser);

describe("/api/user/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ userId: "user1", isAdmin: false });
  });

  it("should return 401 when not authenticated", async () => {
    mockRequireUser.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await GET(new NextRequest("http://localhost:3000/api/user/feed"));
    expect(res.status).toBe(401);
  });

  it("should return activities from followed users by default", async () => {
    mockFollowFindMany.mockResolvedValue([{ followingId: "u2" }]);
    mockUserActivityFindMany.mockResolvedValue([
      {
        id: "a1",
        userId: "u2",
        type: "review",
        message: "Wrote a review",
        link: "/listing/test",
        createdAt: new Date(),
        user: { id: "u2", name: "Bob", email: "bob@test.com", avatar: null },
      },
    ]);
    mockUserActivityCount.mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost:3000/api/user/feed"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.activities).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it("should return only own activities when scope=me", async () => {
    mockUserActivityFindMany.mockResolvedValue([]);
    mockUserActivityCount.mockResolvedValue(0);

    const res = await GET(new NextRequest("http://localhost:3000/api/user/feed?scope=me"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.activities).toHaveLength(0);
    // Should NOT call follow.findMany when scope=me
    expect(mockFollowFindMany).not.toHaveBeenCalled();
  });

  it("should respect pagination params", async () => {
    mockFollowFindMany.mockResolvedValue([]);
    mockUserActivityFindMany.mockResolvedValue([]);
    mockUserActivityCount.mockResolvedValue(50);

    const res = await GET(new NextRequest("http://localhost:3000/api/user/feed?page=2&limit=10"));
    const data = await res.json();

    expect(data.page).toBe(2);
    expect(data.totalPages).toBe(5);
  });
});
