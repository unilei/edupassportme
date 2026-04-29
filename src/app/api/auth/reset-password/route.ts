import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = (await request.json()) as { token?: string; password?: string };

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.usedAt) {
      return NextResponse.json({ error: "Invalid or already used token" }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json({ error: "Token has expired. Please request a new reset link." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    // Update password and mark token as used
    await Promise.all([
      prisma.appUser.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Password has been reset successfully" });
  } catch (err) {
    console.error("[Reset Password Error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
