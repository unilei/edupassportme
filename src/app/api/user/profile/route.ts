import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
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
  const { name, educationLevel, interests, preferredLang, notifyNewMatch, notifyPriceDrop, notifyNewsletter } = body as {
    name?: string;
    educationLevel?: string;
    interests?: string[];
    preferredLang?: string;
    notifyNewMatch?: boolean;
    notifyPriceDrop?: boolean;
    notifyNewsletter?: boolean;
  };

  // Update user name
  if (name !== undefined) {
    await prisma.appUser.update({ where: { id: userId }, data: { name } });
  }

  // Update or create profile
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      ...(educationLevel !== undefined && { educationLevel }),
      ...(interests !== undefined && { interests }),
      ...(preferredLang !== undefined && { preferredLang }),
      ...(notifyNewMatch !== undefined && { notifyNewMatch }),
      ...(notifyPriceDrop !== undefined && { notifyPriceDrop }),
      ...(notifyNewsletter !== undefined && { notifyNewsletter }),
    },
    create: {
      userId,
      educationLevel: educationLevel || null,
      interests: interests || [],
      preferredLang: preferredLang || "en",
    },
  });

  return NextResponse.json({ ok: true });
}
