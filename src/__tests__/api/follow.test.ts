import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockFollowFindMany = vi.fn();
const mockFollowFindUnique = vi.fn();
const mockFollowCreate = vi.fn();
const mockFollowDelete = vi.fn();
const mockAppUserFindUnique = vi.fn();
const mockUserActivityCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follow: {
      findMany: (...args: unknown[]) => mockFollowFindMany(...args),
      findUnique: (...args: unknown[]) => mockFollowFindUnique(...args),
      create: (...args: unknown[]) => mockFollowCreate(...args),
      delete: (...args: unknown[]) => mockFollowDelete(...args),
      count: vi.fn().mockResolvedValue(0),
    },
    appUser: {
      findUnique: (...args: unknown[]) => mockAppUserFindUnique(...args),
    },
    userActivity: {
      create: (...args: unknown[]) => mockUserActivityCreate(...args),
    },
    userBadge: { create: vi.fn().mockRejectedValue(new Error("skip")) },
    review: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { helpful: 0 } }),
    },
    savedListing: { count: vi.fn().mockResolvedValue(0) },
    learningProgress: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/api-utils", () => ({
  requireUser: vi.fn(),
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

import { GET, POST } from "@/app/api/user/follow/route";
import { requireUser } from "@/lib/api-utils";

const mockRequireUser = vi.mocked(requireUser);

function makeGetReq(tab = "following") {
  return new NextRequest(`http://localhost:3000/api/user/follow?tab=${tab}`);
}

function makePostReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/user/follow", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/user/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ userId: "user1", isAdmin: false });
  });

  describe("GET", () => {
    it("should return following list by default", async () => {
      mockFollowFindMany.mockResolvedValue([
        { following: { id: "u2", name: "Bob", email: "bob@test.com", avatar: null } },
      ]);

      const res = await GET(makeGetReq());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.following).toHaveLength(1);
      expect(data.following[0].id).toBe("u2");
      expect(data.count).toBe(1);
    });

    it("should return followers list when tab=followers", async () => {
      mockFollowFindMany.mockResolvedValue([
        { follower: { id: "u3", name: "Carol", email: "carol@test.com", avatar: null } },
      ]);

      const res = await GET(makeGetReq("followers"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.followers).toHaveLength(1);
      expect(data.followers[0].id).toBe("u3");
    });

    it("should return 401 when not authenticated", async () => {
      mockRequireUser.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

      const res = await GET(makeGetReq());

      expect(res.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("should follow a user", async () => {
      mockAppUserFindUnique.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@test.com" });
      mockFollowFindUnique.mockResolvedValue(null);
      mockFollowCreate.mockResolvedValue({ id: "f1" });
      mockUserActivityCreate.mockResolvedValue({});

      const res = await POST(makePostReq({ targetUserId: "u2" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.following).toBe(true);
      expect(mockFollowCreate).toHaveBeenCalled();
    });

    it("should unfollow when already following", async () => {
      mockAppUserFindUnique.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@test.com" });
      mockFollowFindUnique.mockResolvedValue({ id: "f1" });
      mockFollowDelete.mockResolvedValue({});

      const res = await POST(makePostReq({ targetUserId: "u2" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.following).toBe(false);
      expect(mockFollowDelete).toHaveBeenCalled();
    });

    it("should return 400 when targetUserId is missing", async () => {
      const res = await POST(makePostReq({}));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("targetUserId");
    });

    it("should return 400 when trying to follow yourself", async () => {
      const res = await POST(makePostReq({ targetUserId: "user1" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("yourself");
    });

    it("should return 404 when target user does not exist", async () => {
      mockAppUserFindUnique.mockResolvedValue(null);

      const res = await POST(makePostReq({ targetUserId: "nonexistent" }));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found");
    });
  });
});
