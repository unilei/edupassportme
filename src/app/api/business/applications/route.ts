import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUseBusinessWorkspace, getSessionAccountType } from "@/lib/account-types";
import { prisma } from "@/lib/prisma";

const employerApplicationStatuses = [
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_extended",
  "hired",
  "rejected",
  "position_closed",
] as const;

const optionalStringFields = [
  "employerNote",
  "meetingUrl",
  "offerLetterUrl",
  "contractUrl",
] as const;

type SessionUser = Record<string, unknown>;

type BusinessApplicationPatch = {
  applicationId?: unknown;
  status?: unknown;
  interviewAt?: unknown;
  timezone?: unknown;
  interviewTimezone?: unknown;
} & Partial<Record<(typeof optionalStringFields)[number], unknown>>;

type ApplicationDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
};

const applicationInclude = {
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
};

function getBusinessUser(session: unknown) {
  const user = (session as { user?: SessionUser } | null | undefined)?.user;
  const id = typeof user?.id === "string" ? user.id : undefined;
  const role = typeof user?.role === "string" ? user.role : undefined;

  if (!id || id === "admin" || role === "admin") {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (!canUseBusinessWorkspace(getSessionAccountType(user))) {
    return { ok: false as const, status: 403, error: "Business account required" };
  }

  return { ok: true as const, id };
}

function ownerApplicationWhere(userId: string) {
  return {
    listing: {
      OR: [
        { organization: { ownerId: userId } },
        { sourceSubmission: { organization: { ownerId: userId } } },
      ],
    },
  };
}

function hasOwn(body: BusinessApplicationPatch, field: string) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePatch(body: BusinessApplicationPatch) {
  const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";
  if (!applicationId) {
    return { ok: false as const, status: 400, error: "applicationId required" };
  }

  const data: Record<string, string | Date | null> = {};

  if (hasOwn(body, "status")) {
    const status = typeof body.status === "string" ? body.status : "";
    if (!employerApplicationStatuses.includes(status as (typeof employerApplicationStatuses)[number])) {
      return { ok: false as const, status: 400, error: "Invalid status" };
    }
    data.status = status;
  }

  for (const field of optionalStringFields) {
    if (hasOwn(body, field)) {
      data[field] = normalizeOptionalString(body[field]);
    }
  }

  if (hasOwn(body, "timezone") || hasOwn(body, "interviewTimezone")) {
    data.interviewTimezone = normalizeOptionalString(body.timezone ?? body.interviewTimezone);
  }

  if (hasOwn(body, "interviewAt")) {
    const value = body.interviewAt;
    if (typeof value === "string" && value.trim()) {
      const interviewAt = new Date(value);
      if (Number.isNaN(interviewAt.getTime())) {
        return { ok: false as const, status: 400, error: "Invalid interviewAt" };
      }
      data.interviewAt = interviewAt;
    } else {
      data.interviewAt = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false as const, status: 400, error: "No changes provided" };
  }

  return { ok: true as const, applicationId, data };
}

export async function GET() {
  const user = getBusinessUser(await getServerSession(authOptions));
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });

  const application = prisma.application as unknown as ApplicationDelegate;
  const applications = await application.findMany({
    where: ownerApplicationWhere(user.id),
    orderBy: { appliedAt: "desc" },
    include: applicationInclude,
  });

  return NextResponse.json({ applications });
}

export async function PATCH(request: NextRequest) {
  const user = getBusinessUser(await getServerSession(authOptions));
  if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status });

  const normalized = normalizePatch(await request.json() as BusinessApplicationPatch);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: normalized.status });
  }

  const application = prisma.application as unknown as ApplicationDelegate;
  const where = {
    id: normalized.applicationId,
    ...ownerApplicationWhere(user.id),
  };
  const result = await application.updateMany({
    where,
    data: normalized.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await application.findFirst({
    where,
    include: applicationInclude,
  });

  return NextResponse.json({ ok: true, application: updated });
}
