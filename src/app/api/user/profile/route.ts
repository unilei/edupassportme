import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDefaultAccountPath } from "@/lib/account-routing";
import { getSessionAccountType, type AccountType } from "@/lib/account-types";
import { prisma } from "@/lib/prisma";
import { isValidEmail, sanitizeText } from "@/lib/sanitize";

const VALID_PREFERRED_TYPES = new Set(["course", "job", "event", "deal"]);
const ORGANIZATION_TYPES = [
  "school",
  "recruiter",
  "vendor",
  "partner",
  "employer",
  "other",
] as const;
type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
const VALID_ORGANIZATION_TYPES = new Set<string>(ORGANIZATION_TYPES);
const ACTIVE_DEAL_PROGRAM_STATUSES = ["pending", "approved", "invited", "active"] as const;

type CurrentUser = {
  id: string;
  email?: string | null;
  role?: string | null;
  accountType: AccountType;
};

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  const id = sessionUser?.id as string | undefined;
  const role = sessionUser?.role as string | undefined;

  if (!id || id === "admin" || role === "admin") return null;

  const user = await prisma.appUser.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, accountType: true },
  });

  return {
    id: user?.id ?? id,
    email: user?.email,
    role: user?.role ?? role,
    accountType: getSessionAccountType(user ?? sessionUser),
  };
}

function normalizeStringList(value: unknown, limit = 12): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 80));

  return [...new Set(normalized)].slice(0, limit);
}

function normalizePreferredTypes(value: unknown): string[] | undefined {
  const normalized = normalizeStringList(value, 4);
  return normalized?.filter((type) => VALID_PREFERRED_TYPES.has(type));
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return sanitizeText(value, maxLength);
}

function normalizeWebsite(value: unknown) {
  const raw = cleanString(value, 500);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeOrganizationType(value: unknown, accountType: AccountType): OrganizationType {
  if (accountType === "partner") return "partner";
  return typeof value === "string" && VALID_ORGANIZATION_TYPES.has(value)
    ? value as OrganizationType
    : "other";
}

function profileCompletionForUser(user: {
  name: string | null;
  accountType?: AccountType | null;
  profile: {
    educationLevel: string | null;
    interests: string[];
    goals: string[];
    targetRegions: string[];
    preferredTypes: string[];
    onboardingCompletedAt: Date | string | null;
  } | null;
  organizations?: {
    name: string;
    website: string | null;
    description: string | null;
  }[];
  dealProgramRequests?: { id: string }[];
}) {
  const accountType = getSessionAccountType(user);
  const missing: string[] = [];
  let completed = 0;
  const total = accountType === "individual" ? 6 : accountType === "partner" ? 5 : 4;
  const profile = user.profile;
  const organization = user.organizations?.[0];

  const add = (ok: boolean, label: string) => {
    if (ok) completed += 1;
    else missing.push(label);
  };

  add(Boolean(user.name), "display name");

  if (accountType === "individual") {
    add(Boolean(profile?.educationLevel), "education level");
    add(Boolean(profile?.interests?.length), "interests");
    add(Boolean(profile?.goals?.length), "goals");
    add(Boolean(profile?.targetRegions?.length), "target regions");
    add(Boolean(profile?.preferredTypes?.length), "opportunity types");
  } else {
    add(Boolean(organization?.name), "organization name");
    add(Boolean(organization?.website), "organization website");
    add(Boolean(organization?.description), "organization description");
    if (accountType === "partner") {
      add(Boolean(user.dealProgramRequests?.length), "deal program application");
    }
  }

  return {
    percent: Math.round((completed / total) * 100),
    missing,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    nextPath: profile?.onboardingCompletedAt ? getDefaultAccountPath(accountType) : "/onboarding",
  };
}

async function upsertBusinessIdentity(user: CurrentUser, body: Record<string, unknown>, completeOnboarding: boolean) {
  if (user.accountType === "individual") return { ok: true as const };

  const organizationName = cleanString(body.organizationName, 160);
  const organizationDescription = cleanString(body.organizationDescription, 1000) || null;
  const organizationWebsite = normalizeWebsite(body.organizationWebsite);

  if (organizationWebsite === undefined) {
    return { ok: false as const, error: "Organization website must be a valid http or https URL." };
  }

  if (completeOnboarding && !organizationName) {
    return { ok: false as const, error: "Organization name is required to complete onboarding." };
  }

  if (!organizationName) return { ok: true as const };

  const organizationType = normalizeOrganizationType(body.organizationType, user.accountType);
  const existing = await prisma.organization.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const organizationData = {
    name: organizationName,
    type: organizationType,
    website: organizationWebsite,
    description: organizationDescription,
    ownerId: user.id,
  };

  const organization = existing
    ? await prisma.organization.update({
      where: { id: existing.id },
      data: organizationData,
      select: { id: true },
    })
    : await prisma.organization.create({
      data: organizationData,
      select: { id: true },
    });

  if (user.accountType !== "partner") return { ok: true as const };

  const contactName = cleanString(body.contactName, 120);
  const contactEmail = cleanString(body.contactEmail, 254).toLowerCase() || user.email || "";
  const proposedOffer = cleanString(body.proposedOffer, 3000);
  const targetAudience = cleanString(body.targetAudience, 1000) || null;

  if (completeOnboarding && (!contactName || !contactEmail || !proposedOffer)) {
    return {
      ok: false as const,
      error: "Contact name, contact email, and proposed offer are required to complete partner onboarding.",
    };
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    return { ok: false as const, error: "Contact email must be a valid email address." };
  }

  if (!contactName || !contactEmail || !proposedOffer) return { ok: true as const };

  const duplicate = await prisma.dealProgramApplication.findFirst({
    where: {
      organizationId: organization.id,
      status: { in: [...ACTIVE_DEAL_PROGRAM_STATUSES] },
    },
    select: { id: true },
  });

  if (!duplicate) {
    await prisma.dealProgramApplication.create({
      data: {
        organizationId: organization.id,
        submittedById: user.id,
        contactName,
        contactEmail,
        proposedOffer,
        targetAudience,
        status: "pending",
      },
      select: { id: true },
    });
  }

  return { ok: true as const };
}

// GET — get current user profile
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      accountType: true,
      profile: true,
      organizations: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          name: true,
          type: true,
          website: true,
          description: true,
          status: true,
        },
      },
      dealProgramRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          proposedOffer: true,
          targetAudience: true,
        },
      },
      _count: { select: { savedListings: true, savedSearches: true } },
    },
  });

  return NextResponse.json({
    user,
    profileCompletion: user ? profileCompletionForUser(user) : null,
  });
}

// PUT — update profile
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    name,
    educationLevel,
    interests,
    goals,
    targetRegions,
    preferredTypes,
    preferredLang,
    notifyNewMatch,
    notifyPriceDrop,
    notifyNewsletter,
    completeOnboarding,
  } = body as {
    name?: string;
    educationLevel?: string;
    interests?: string[];
    goals?: string[];
    targetRegions?: string[];
    preferredTypes?: string[];
    preferredLang?: string;
    notifyNewMatch?: boolean;
    notifyPriceDrop?: boolean;
    notifyNewsletter?: boolean;
    completeOnboarding?: boolean;
  };
  const normalizedInterests = normalizeStringList(interests, 18);
  const normalizedGoals = normalizeStringList(goals, 8);
  const normalizedTargetRegions = normalizeStringList(targetRegions, 8);
  const normalizedPreferredTypes = normalizePreferredTypes(preferredTypes);
  const onboardingCompletedAt = completeOnboarding ? new Date() : undefined;
  const businessIdentity = await upsertBusinessIdentity(user, body as Record<string, unknown>, Boolean(completeOnboarding));
  if (!businessIdentity.ok) {
    return NextResponse.json({ error: businessIdentity.error }, { status: 400 });
  }

  // Update user name
  if (name !== undefined) {
    await prisma.appUser.update({ where: { id: user.id }, data: { name } });
  }

  // Update or create profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      ...(educationLevel !== undefined && { educationLevel }),
      ...(normalizedInterests !== undefined && { interests: normalizedInterests }),
      ...(normalizedGoals !== undefined && { goals: normalizedGoals }),
      ...(normalizedTargetRegions !== undefined && { targetRegions: normalizedTargetRegions }),
      ...(normalizedPreferredTypes !== undefined && { preferredTypes: normalizedPreferredTypes }),
      ...(onboardingCompletedAt !== undefined && { onboardingCompletedAt }),
      ...(preferredLang !== undefined && { preferredLang }),
      ...(notifyNewMatch !== undefined && { notifyNewMatch }),
      ...(notifyPriceDrop !== undefined && { notifyPriceDrop }),
      ...(notifyNewsletter !== undefined && { notifyNewsletter }),
    },
    create: {
      userId: user.id,
      educationLevel: educationLevel || null,
      interests: normalizedInterests || [],
      goals: normalizedGoals || [],
      targetRegions: normalizedTargetRegions || [],
      preferredTypes: normalizedPreferredTypes || [],
      ...(onboardingCompletedAt !== undefined && { onboardingCompletedAt }),
      preferredLang: preferredLang || "en",
    },
  });

  return NextResponse.json({
    ok: true,
    nextPath: onboardingCompletedAt ? getDefaultAccountPath(user.accountType) : "/profile",
  });
}
