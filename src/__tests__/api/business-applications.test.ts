import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationUpdateMany: vi.fn(),
  applicationFindFirst: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: mocks.applicationFindMany,
      updateMany: mocks.applicationUpdateMany,
      findFirst: mocks.applicationFindFirst,
    },
  },
}));

import { GET, PATCH } from "@/app/api/business/applications/route";

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/business/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/business/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "owner_1", role: "user" } });
    mocks.applicationFindMany.mockResolvedValue([
      {
        id: "app_1",
        status: "under_review",
        appliedAt: new Date("2026-05-10T00:00:00.000Z"),
        user: { id: "student_1", name: "Student One", email: "student@example.com", profile: null },
        listing: {
          id: "listing_1",
          title: "Program Manager",
          slug: "program-manager",
          type: "job",
          companyName: "Example Employer",
          organization: { id: "org_1", name: "Example Employer" },
          sourceSubmission: null,
        },
      },
    ]);
    mocks.applicationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.applicationFindFirst.mockResolvedValue({
      id: "app_1",
      status: "interview_scheduled",
      employerNote: "Strong candidate",
    });
  });

  it("rejects guests and admin sessions", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const guest = await GET();

    expect(guest.status).toBe(401);
    expect(await guest.json()).toEqual({ error: "Unauthorized" });

    mocks.getServerSession.mockResolvedValue({ user: { id: "admin", role: "admin" } });

    const admin = await PATCH(patchRequest({ applicationId: "app_1", status: "under_review" }));

    expect(admin.status).toBe(401);
    expect(await admin.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.applicationFindMany).not.toHaveBeenCalled();
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });

  it("lists only applications attached to listings owned by the current business owner", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.applications).toHaveLength(1);
    expect(mocks.applicationFindMany).toHaveBeenCalledWith({
      where: {
        listing: {
          OR: [
            { organization: { ownerId: "owner_1" } },
            { sourceSubmission: { organization: { ownerId: "owner_1" } } },
          ],
        },
      },
      orderBy: { appliedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                headline: true,
                resumeUrl: true,
                educationLevel: true,
                skills: true,
              },
            },
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            companyName: true,
            location: true,
            organization: { select: { id: true, name: true } },
            sourceSubmission: {
              select: { organization: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
  });

  it("updates employer-managed fields only through an owned listing", async () => {
    const interviewAt = "2026-06-20T16:00:00.000Z";

    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "interview_scheduled",
      employerNote: "Strong candidate",
      interviewAt,
      timezone: "America/New_York",
      meetingUrl: "https://meet.example.com/app_1",
      offerLetterUrl: "https://files.example.com/offer.pdf",
      contractUrl: "",
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      application: {
        id: "app_1",
        status: "interview_scheduled",
        employerNote: "Strong candidate",
      },
    });
    expect(mocks.applicationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "app_1",
        listing: {
          OR: [
            { organization: { ownerId: "owner_1" } },
            { sourceSubmission: { organization: { ownerId: "owner_1" } } },
          ],
        },
      },
      data: {
        status: "interview_scheduled",
        employerNote: "Strong candidate",
        interviewAt: new Date(interviewAt),
        interviewTimezone: "America/New_York",
        meetingUrl: "https://meet.example.com/app_1",
        offerLetterUrl: "https://files.example.com/offer.pdf",
        contractUrl: null,
      },
    });
    expect(mocks.applicationFindFirst).toHaveBeenCalledWith({
      where: {
        id: "app_1",
        listing: {
          OR: [
            { organization: { ownerId: "owner_1" } },
            { sourceSubmission: { organization: { ownerId: "owner_1" } } },
          ],
        },
      },
      include: expect.any(Object),
    });
  });

  it("rejects statuses employers are not allowed to manage", async () => {
    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "offer_accepted",
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status" });
    expect(mocks.applicationUpdateMany).not.toHaveBeenCalled();
  });

  it("does not update applications outside the current owner's listings", async () => {
    mocks.applicationUpdateMany.mockResolvedValue({ count: 0 });

    const res = await PATCH(patchRequest({
      applicationId: "app_other",
      status: "rejected",
    }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Application not found" });
  });
});
