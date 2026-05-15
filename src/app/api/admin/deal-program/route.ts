import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { buildPlanPermissionUpdate } from "@/lib/marketplace/permissions";
import { prisma } from "@/lib/prisma";

const DEAL_PROGRAM_STATUSES = ["pending", "approved", "rejected", "invited", "active", "suspended"] as const;
const ACTIONS = ["approve", "reject", "invite", "activate", "suspend"] as const;

type DealProgramStatus = (typeof DEAL_PROGRAM_STATUSES)[number];
type DealProgramAction = (typeof ACTIONS)[number];

type LooseDealProgramDelegate = {
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  update(args: unknown): Promise<unknown>;
};

type LooseOrganizationDelegate = {
  update(args: unknown): Promise<unknown>;
};

type LooseTransactionClient = {
  dealProgramApplication: LooseDealProgramDelegate;
  organization: LooseOrganizationDelegate;
};

type LoosePrisma = {
  dealProgramApplication: LooseDealProgramDelegate;
  organization: LooseOrganizationDelegate;
  $transaction<T>(callback: (tx: LooseTransactionClient) => Promise<T>): Promise<T>;
};

function db() {
  return prisma as unknown as LoosePrisma;
}

function isValueIn<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeReviewNote(value: unknown) {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length > 0 ? note : null;
}

function getAdminUserId(session: Awaited<ReturnType<typeof requireAdmin>>) {
  const userId = session?.user && "id" in session.user ? session.user.id : undefined;
  return typeof userId === "string" && userId.length > 0 && userId !== "admin" ? userId : null;
}

function statusForAction(action: DealProgramAction): DealProgramStatus {
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  if (action === "invite") return "invited";
  if (action === "activate") return "active";
  return "suspended";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 20);
  const status = url.searchParams.get("status") || "";
  const search = typeof url.searchParams.get("search") === "string" ? url.searchParams.get("search")!.trim() : "";

  if (status && !isValueIn(DEAL_PROGRAM_STATUSES, status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status as DealProgramStatus;
  if (search) {
    where.OR = [
      { contactName: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
      { proposedOffer: { contains: search, mode: "insensitive" } },
      { organization: { name: { contains: search, mode: "insensitive" } } },
      { organization: { owner: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const client = db();
  const [applications, total] = await Promise.all([
    client.dealProgramApplication.findMany({
      where,
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        proposedOffer: true,
        targetAudience: true,
        status: true,
        reviewNote: true,
        reviewedAt: true,
        invitedAt: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            plan: true,
            canPostDeals: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        submittedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    client.dealProgramApplication.count({ where }),
  ]);

  return NextResponse.json({
    applications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { id, action } = body;

  if (typeof id !== "string" || id.trim().length === 0 || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }
  if (!isValueIn(ACTIONS, action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const client = db();
  const application = await client.dealProgramApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      organizationId: true,
      contactEmail: true,
      organization: { select: { id: true, name: true, status: true, plan: true, canPostDeals: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Deal Program application not found" }, { status: 404 });
  }

  const reviewedAt = new Date();
  const reviewedById = getAdminUserId(adminSession);
  const reviewNote = normalizeReviewNote(body.reviewNote);
  const nextStatus = statusForAction(action);
  const updateData: Record<string, unknown> = {
    status: nextStatus,
    reviewNote,
    reviewedAt,
    reviewedById,
  };

  if (action === "invite") {
    updateData.invitedAt = reviewedAt;
    updateData.invitationToken = randomUUID();
  }

  const updated =
    action === "approve" || action === "activate"
      ? await client.$transaction(async (tx) => {
          const result = await tx.dealProgramApplication.update({
            where: { id },
            data: updateData,
            select: {
              id: true,
              status: true,
              reviewNote: true,
              reviewedAt: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  plan: true,
                  canPostDeals: true,
                },
              },
            },
          });

          await tx.organization.update({
            where: { id: application.organizationId },
            data: {
              ...buildPlanPermissionUpdate("partner"),
              ...(action === "activate" ? { status: "active" } : {}),
            },
          });

          return result;
        })
      : await client.dealProgramApplication.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            status: true,
            reviewNote: true,
            reviewedAt: true,
            invitedAt: true,
            organization: { select: { id: true, name: true, status: true, plan: true, canPostDeals: true } },
          },
        });

  await auditLog("admin", `dealProgram.${action}`, id, {
    organizationId: application.organizationId,
    organizationName:
      application.organization && typeof application.organization === "object" && "name" in application.organization
        ? application.organization.name
        : undefined,
    previousStatus: application.status,
    status: nextStatus,
    reviewNote,
    grantedDealPermission: action === "approve" || action === "activate",
  });

  return NextResponse.json({ ok: true, application: updated });
}
