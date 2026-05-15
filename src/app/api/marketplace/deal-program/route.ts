import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidEmail, sanitizeText } from "@/lib/sanitize";

const ACTIVE_DEAL_PROGRAM_STATUSES = ["pending", "approved", "invited", "active"] as const;

type NormalizedDealProgramInput = {
  organizationName: string;
  organizationWebsite: string;
  contactName: string;
  contactEmail: string;
  proposedOffer: string;
  targetAudience: string | null;
};

type NormalizeResult =
  | { ok: true; data: NormalizedDealProgramInput }
  | { ok: false; error: string };

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const id = user?.id as string | undefined;
  const role = user?.role as string | undefined;

  return id && id !== "admin" && role !== "admin" ? id : null;
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return sanitizeText(value, maxLength);
}

function normalizeWebsite(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeDealProgramInput(input: Record<string, unknown>): NormalizeResult {
  const organizationName = cleanString(input.organizationName, 160);
  const organizationWebsiteRaw = cleanString(input.organizationWebsite, 500);
  const contactName = cleanString(input.contactName, 120);
  const contactEmail = cleanString(input.contactEmail, 254).toLowerCase();
  const proposedOffer = cleanString(input.proposedOffer, 3000);
  const targetAudience = cleanString(input.targetAudience, 1000) || null;

  if (
    !organizationName ||
    !organizationWebsiteRaw ||
    !contactName ||
    !contactEmail ||
    !proposedOffer
  ) {
    return {
      ok: false,
      error: "Organization name, website, contact name, contact email, and proposed offer are required.",
    };
  }

  const organizationWebsite = normalizeWebsite(organizationWebsiteRaw);
  if (!organizationWebsite) {
    return { ok: false, error: "Organization website must be a valid http or https URL." };
  }

  if (!isValidEmail(contactEmail)) {
    return { ok: false, error: "Contact email must be a valid email address." };
  }

  return {
    ok: true,
    data: {
      organizationName,
      organizationWebsite,
      contactName,
      contactEmail,
      proposedOffer,
      targetAudience,
    },
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.dealProgramApplication.findMany({
    where: { submittedById: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      contactName: true,
      contactEmail: true,
      proposedOffer: true,
      targetAudience: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { id: true, name: true, type: true, status: true, website: true },
      },
    },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const normalized = normalizeDealProgramInput(body);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const data = normalized.data;
  const existingOrganization = await prisma.organization.findFirst({
    where: {
      ownerId: userId,
      OR: [
        { name: data.organizationName },
        { website: data.organizationWebsite },
      ],
    },
    select: { id: true },
  });

  const organization =
    existingOrganization ??
    (await prisma.organization.create({
      data: {
        name: data.organizationName,
        website: data.organizationWebsite,
        type: "partner",
        ownerId: userId,
      },
      select: { id: true },
    }));

  const duplicate = await prisma.dealProgramApplication.findFirst({
    where: {
      organizationId: organization.id,
      status: { in: [...ACTIVE_DEAL_PROGRAM_STATUSES] },
    },
    select: { id: true, status: true },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "This organization already has an active deal program application." },
      { status: 409 },
    );
  }

  const application = await prisma.dealProgramApplication.create({
    data: {
      organizationId: organization.id,
      submittedById: userId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      proposedOffer: data.proposedOffer,
      targetAudience: data.targetAudience,
      status: "pending",
    },
    select: {
      id: true,
      status: true,
      contactName: true,
      contactEmail: true,
      proposedOffer: true,
      targetAudience: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
      organization: { select: { id: true, name: true, website: true } },
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
