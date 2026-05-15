import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  savedSearchFindMany: vi.fn(),
  savedSearchUpdate: vi.fn(),
  listingFindMany: vi.fn(),
  savedListingFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  notificationCreate: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearch: {
      findMany: mocks.savedSearchFindMany,
      update: mocks.savedSearchUpdate,
    },
    listing: {
      findMany: mocks.listingFindMany,
    },
    savedListing: {
      findMany: mocks.savedListingFindMany,
    },
    notification: {
      findFirst: mocks.notificationFindFirst,
      create: mocks.notificationCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendMail: mocks.sendMail,
  newMatchTemplate: vi.fn(() => ({ subject: "New matches", html: "", text: "" })),
  priceDropTemplate: vi.fn(() => ({ subject: "Price drop", html: "", text: "" })),
}));

import { GET } from "@/app/api/cron/notify/route";

describe("/api/cron/notify workspace reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.savedSearchFindMany.mockResolvedValue([]);
    mocks.listingFindMany.mockResolvedValue([]);
    mocks.notificationFindFirst.mockResolvedValue(null);
    mocks.notificationCreate.mockResolvedValue({});
  });

  it("creates opportunity reminders for saved listings with due next actions or deadlines", async () => {
    const nextActionAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mocks.savedListingFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "saved_1",
          nextActionAt,
          deadlineAt: null,
          status: "applying",
          user: {
            id: "user_1",
            name: "Alex",
            profile: { notifyNewMatch: true },
          },
          listing: {
            title: "Data Science Internship Prep",
            slug: "data-science-internship-prep",
          },
        },
      ]);

    const res = await GET(new NextRequest("http://localhost:3000/api/cron/notify"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.workspaceReminders).toBe(1);
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        type: "opportunity_reminder",
        title: "Next action due for Data Science Internship Prep",
        link: "/workspace?item=saved_1",
        emailSent: false,
      }),
    });
  });
});
