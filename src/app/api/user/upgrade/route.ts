import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { upgradeToPro } from "@/lib/pro";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
    if (!userId || userId === "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as string | undefined; // "monthly" | "annual"

    // In production, integrate Stripe/payment gateway here.
    // For now, mock: monthly = 1 month, annual = 12 months.
    const months = plan === "annual" ? 12 : 1;

    const result = await upgradeToPro(userId, months);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Upgrade Error]", err);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
