import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth before importing
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import {
  apiError,
  apiSuccess,
  requireUser,
  requireIndividualUser,
  requireAdmin,
  isAuthError,
  parsePagination,
} from "@/lib/api-utils";
import { NextResponse } from "next/server";

const mockedGetSession = vi.mocked(getServerSession);

describe("api-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("apiError", () => {
    it("returns JSON response with error message and status", async () => {
      const res = apiError("Not found", 404);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Not found" });
    });
  });

  describe("apiSuccess", () => {
    it("returns JSON response with data and default 200 status", async () => {
      const res = apiSuccess({ items: [1, 2] });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ items: [1, 2] });
    });

    it("supports custom status code", async () => {
      const res = apiSuccess({ id: "abc" }, 201);
      expect(res.status).toBe(201);
    });
  });

  describe("requireUser", () => {
    it("returns userId when logged in as user", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user1" } });
      const result = await requireUser();
      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) {
        expect(result.userId).toBe("user1");
        expect(result.isAdmin).toBe(false);
      }
    });

    it("returns 401 when not logged in", async () => {
      mockedGetSession.mockResolvedValue(null);
      const result = await requireUser();
      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) {
        expect(result.status).toBe(401);
      }
    });

    it("returns 401 when logged in as admin", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "admin" } });
      const result = await requireUser();
      expect(isAuthError(result)).toBe(true);
    });
  });

  describe("requireIndividualUser", () => {
    it("returns userId when logged in as an individual account", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user1", accountType: "individual" } });
      const result = await requireIndividualUser();
      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) {
        expect(result.userId).toBe("user1");
        expect(result.isAdmin).toBe(false);
      }
    });

    it("returns 403 for organization accounts", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "org1", accountType: "organization" } });
      const result = await requireIndividualUser();
      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) {
        expect(result.status).toBe(403);
        expect(await result.json()).toEqual({ error: "Individual account required" });
      }
    });

    it("normalizes legacy student account type as individual", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user1", accountType: "student" } });
      const result = await requireIndividualUser();
      expect(isAuthError(result)).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("returns admin auth when logged in as admin", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "admin", role: "admin" } });
      const result = await requireAdmin();
      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) {
        expect(result.userId).toBe("admin");
        expect(result.isAdmin).toBe(true);
      }
    });

    it("returns 401 when logged in as regular user", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "user1" } });
      const result = await requireAdmin();
      expect(isAuthError(result)).toBe(true);
    });

    it("returns 401 for the admin id without the admin role", async () => {
      mockedGetSession.mockResolvedValue({ user: { id: "admin", role: "user" } });
      const result = await requireAdmin();
      expect(isAuthError(result)).toBe(true);
    });
  });

  describe("isAuthError", () => {
    it("returns true for NextResponse", () => {
      const res = NextResponse.json({}, { status: 401 });
      expect(isAuthError(res)).toBe(true);
    });

    it("returns false for auth result object", () => {
      expect(isAuthError({ userId: "u1", isAdmin: false })).toBe(false);
    });
  });

  describe("parsePagination", () => {
    it("returns defaults for empty params", () => {
      const params = new URLSearchParams();
      const result = parsePagination(params);
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it("parses page and limit", () => {
      const params = new URLSearchParams({ page: "3", limit: "10" });
      const result = parsePagination(params);
      expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
    });

    it("clamps page to minimum 1", () => {
      const params = new URLSearchParams({ page: "-5" });
      const result = parsePagination(params);
      expect(result.page).toBe(1);
    });

    it("clamps limit to maximum 100", () => {
      const params = new URLSearchParams({ limit: "500" });
      const result = parsePagination(params);
      expect(result.limit).toBe(100);
    });

    it("uses custom default limit", () => {
      const params = new URLSearchParams();
      const result = parsePagination(params, 50);
      expect(result.limit).toBe(50);
    });
  });
});
