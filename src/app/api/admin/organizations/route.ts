import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_STATUSES = ["pending", "active", "suspended", "rejected"] as const;
const ORGANIZATION_TYPES = ["school", "recruiter", "vendor", "partner", "employer", "other"] as const;
const ORGANIZATION_PLANS = ["free", "business", "partner", "enterprise"] as const;
const ACTIONS = ["update", "verify", "unverify"] as const;
const BOOLEAN_FIELDS = ["canPostJobs", "canPostEvents", "canPostDeals", "canSponsor"] as const;
const LIMIT_FIELDS = ["jobPostLimit", "eventPostLimit", "dealPostLimit", "sponsoredLimit"] as const;
const DIRECT_UPDATE_FIELDS = ["status", "plan", ...BOOLEAN_FIELDS, ...LIMIT_FIELDS, "verify"] as const;

type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number];
type OrganizationAction = (typeof ACTIONS)[number];
type OrganizationUpdateField = (typeof DIRECT_UPDATE_FIELDS)[number];

type LooseDelegate = {
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  update(args: unknown): Promise<unknown>;
};

function organizationDelegate() {
  return prisma.organization as unknown as LooseDelegate;
}

function isValueIn<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSearch(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUpdates(body: Record<string, unknown>) {
  const source = body.updates;
  if (source !== undefined && (!source || typeof source !== "object" || Array.isArray(source))) {
    return { ok: false as const, error: "Invalid updates" };
  }

  const raw = (source ?? body) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const unknownFields = Object.keys(raw).filter(
    (key) => !DIRECT_UPDATE_FIELDS.includes(key as OrganizationUpdateField),
  );

  if (source !== undefined && unknownFields.length > 0) {
    return { ok: false as const, error: `Invalid update field: ${unknownFields[0]}` };
  }

  if ("status" in raw) {
    if (!isValueIn(ORGANIZATION_STATUSES, raw.status)) {
      return { ok: false as const, error: "Invalid status" };
    }
    data.status = raw.status;
  }

  if ("plan" in raw) {
    if (!isValueIn(ORGANIZATION_PLANS, raw.plan)) {
      return { ok: false as const, error: "Invalid plan" };
    }
    data.plan = raw.plan;
  }

  for (const field of BOOLEAN_FIELDS) {
    if (field in raw) {
      if (typeof raw[field] !== "boolean") {
        return { ok: false as const, error: `Invalid ${field}` };
      }
      data[field] = raw[field];
    }
  }

  for (const field of LIMIT_FIELDS) {
    if (field in raw) {
      const value = raw[field];
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        return { ok: false as const, error: `Invalid ${field}` };
      }
      data[field] = value;
    }
  }

  if ("verify" in raw) {
    if (typeof raw.verify !== "boolean") {
      return { ok: false as const, error: "Invalid verify" };
    }
    data.verifiedAt = raw.verify ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false as const, error: "No valid update fields" };
  }

  return { ok: true as const, data };
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 20);
  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";
  const plan = url.searchParams.get("plan") || "";
  const search = normalizeSearch(url.searchParams.get("search"));

  if (status && !isValueIn(ORGANIZATION_STATUSES, status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }
  if (type && !isValueIn(ORGANIZATION_TYPES, type)) {
    return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
  }
  if (plan && !isValueIn(ORGANIZATION_PLANS, plan)) {
    return NextResponse.json({ error: "Invalid plan filter" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status as OrganizationStatus;
  if (type) where.type = type as OrganizationType;
  if (plan) where.plan = plan as OrganizationPlan;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { website: { contains: search, mode: "insensitive" } },
      { owner: { email: { contains: search, mode: "insensitive" } } },
      { owner: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const delegate = organizationDelegate();
  const [organizations, total] = await Promise.all([
    delegate.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        website: true,
        description: true,
        status: true,
        plan: true,
        canPostJobs: true,
        canPostEvents: true,
        canPostDeals: true,
        canSponsor: true,
        jobPostLimit: true,
        eventPostLimit: true,
        dealPostLimit: true,
        sponsoredLimit: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            submissions: true,
            listings: true,
            dealProgramApplications: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    delegate.count({ where }),
  ]);

  return NextResponse.json({
    organizations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
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

  let data: Record<string, unknown>;
  if (action === "verify") {
    data = { verifiedAt: new Date() };
  } else if (action === "unverify") {
    data = { verifiedAt: null };
  } else {
    const normalized = normalizeUpdates(body);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    data = normalized.data;
  }

  const delegate = organizationDelegate();
  const organization = await delegate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      plan: true,
      canPostJobs: true,
      canPostEvents: true,
      canPostDeals: true,
      canSponsor: true,
      jobPostLimit: true,
      eventPostLimit: true,
      dealPostLimit: true,
      sponsoredLimit: true,
      verifiedAt: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const updated = await delegate.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      plan: true,
      canPostJobs: true,
      canPostEvents: true,
      canPostDeals: true,
      canSponsor: true,
      jobPostLimit: true,
      eventPostLimit: true,
      dealPostLimit: true,
      sponsoredLimit: true,
      verifiedAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await auditLog("admin", `organization.${action as OrganizationAction}`, id, {
    organizationName: organization.name,
    previousStatus: organization.status,
    previousPlan: organization.plan,
    changes: data,
  });

  return NextResponse.json({ ok: true, organization: updated });
}
