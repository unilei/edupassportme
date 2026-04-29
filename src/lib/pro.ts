import { prisma } from "@/lib/prisma";

export const PRO_LIMITS = {
  free: { maxSavedListings: 20, maxSavedSearches: 3, canAutoApply: false, showAds: true },
  pro: { maxSavedListings: Infinity, maxSavedSearches: Infinity, canAutoApply: true, showAds: false },
} as const;

export type Tier = "free" | "pro";

export interface TierLimits {
  maxSavedListings: number;
  maxSavedSearches: number;
  canAutoApply: boolean;
  showAds: boolean;
}

export function getTierLimits(tier: Tier): TierLimits {
  return PRO_LIMITS[tier] ?? PRO_LIMITS.free;
}

export async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { tier: true, proExpiresAt: true },
  });
  if (!user || user.tier !== "pro") return false;
  if (user.proExpiresAt && user.proExpiresAt < new Date()) return false;
  return true;
}

export async function upgradeToPro(userId: string, months: number = 1): Promise<{ ok: boolean; expiresAt: Date }> {
  const now = new Date();
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { proExpiresAt: true },
  });

  // Extend from current expiry if still active, otherwise from now
  const base = user?.proExpiresAt && user.proExpiresAt > now ? user.proExpiresAt : now;
  const expiresAt = new Date(base);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await prisma.appUser.update({
    where: { id: userId },
    data: { tier: "pro", proExpiresAt: expiresAt },
  });

  return { ok: true, expiresAt };
}
