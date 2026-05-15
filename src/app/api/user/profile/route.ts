import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_PREFERRED_TYPES = new Set(["course", "job", "event", "deal"]);

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
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
      profile: true,
      _count: { select: { savedListings: true, savedSearches: true } },
    },
  });

  return NextResponse.json({ user });
}

// PUT — update profile
export async function PUT(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Update user name
  if (name !== undefined) {
    await prisma.appUser.update({ where: { id: userId }, data: { name } });
  }

  // Update or create profile
  await prisma.userProfile.upsert({
    where: { userId },
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
      userId,
      educationLevel: educationLevel || null,
      interests: normalizedInterests || [],
      goals: normalizedGoals || [],
      targetRegions: normalizedTargetRegions || [],
      preferredTypes: normalizedPreferredTypes || [],
      ...(onboardingCompletedAt !== undefined && { onboardingCompletedAt }),
      preferredLang: preferredLang || "en",
    },
  });

  return NextResponse.json({ ok: true });
}
