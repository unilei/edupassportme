import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  applicationUpdateMany: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/api-utils", () => ({
  requireIndividualUser: vi.fn(),
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      updateMany: mocks.applicationUpdateMany,
    },
  },
}));

import { PATCH } from "@/app/api/user/applications/route";
import { requireIndividualUser } from "@/lib/api-utils";

const mockRequireIndividualUser = vi.mocked(requireIndividualUser);

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/user/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/user/applications lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mockRequireIndividualUser.mockResolvedValue({ userId: "user_1", isAdmin: false });
    mocks.applicationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("updates interview scheduling fields only for the current user's application", async () => {
    const interviewAt = "2026-06-15T14:30:00.000Z";

    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "interview_scheduled",
      interviewAt,
      interviewTimezone: "America/New_York",
      meetingUrl: "https://meet.example.com/interview",
      candidateNote: "I can bring my portfolio.",
    }));

    expect(res.status).toBe(200);
    expect(mocks.applicationUpdateMany).toHaveBeenCalledWith({
      where: { id: "app_1", userId: "user_1" },
      data: expect.objectContaining({
        status: "interview_scheduled",
        interviewAt: new Date(interviewAt),
        interviewTimezone: "America/New_York",
        meetingUrl: "https://meet.example.com/interview",
        candidateNote: "I can bring my portfolio.",
      }),
    });
  });

  it("rejects non-individual accounts before updating applications", async () => {
    mockRequireIndividualUser.mockResolvedValue(
      NextResponse.json({ error: "Individual account required" }, { status: 403 }),
    );

    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "interview_scheduled",
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Individual account required" });
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects unknown application statuses", async () => {
    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "waiting",
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid status" });
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects employer-managed fields from the user-owned route", async () => {
    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "applied",
      offerLetterUrl: "https://files.example.org/offer.pdf",
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: "offerLetterUrl is managed by EDU Passport or the employer",
    });
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects employer-owned terminal statuses", async () => {
    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "hired",
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status" });
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });
});
