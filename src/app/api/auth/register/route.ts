import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/tokens";
import { sendMail, emailVerificationTemplate } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.appUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.appUser.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        profile: { create: {} },
      },
      select: { id: true, email: true, name: true },
    });

    // Send verification email
    const token = await createVerificationToken(user.id);
    const template = emailVerificationTemplate(user.name || "", token);
    await sendMail({ to: email, ...template });

    return NextResponse.json({
      user,
      requiresVerification: true,
      message: "Verification email sent. Please check your email before signing in.",
    }, { status: 201 });
  } catch (err) {
    console.error("[Register Error]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create account", detail: msg }, { status: 500 });
  }
}
