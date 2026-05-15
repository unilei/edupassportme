import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/tokens";
import { sendMail, emailVerificationTemplate } from "@/lib/email";

const GENERIC_MESSAGE = "If an unverified account exists for that email, a verification link has been sent.";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required", code: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const user = await prisma.appUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const token = await createVerificationToken(user.id);
    const template = emailVerificationTemplate(user.name || "", token);
    await sendMail({ to: user.email, ...template });

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("[Resend Verification Error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
