import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendMail, passwordResetTemplate } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const user = await prisma.appUser.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const template = passwordResetTemplate(user.name || "", token);
      await sendMail({ to: user.email, ...template });
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
