import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
    if (!userId || userId === "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Direct Pro upgrades are disabled. Pro access is manually activated by an admin.",
        code: "mock_upgrade_disabled",
      },
      { status: 410 },
    );
  } catch (err) {
    console.error("[Upgrade Error]", err);
    return NextResponse.json({ error: "Failed to process upgrade request" }, { status: 500 });
  }
}
