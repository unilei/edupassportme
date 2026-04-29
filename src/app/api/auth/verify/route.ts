import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, welcomeTemplate } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return NextResponse.json({ error: "Token has expired. Please request a new verification email." }, { status: 400 });
  }

  // Mark user as verified
  const user = await prisma.appUser.update({
    where: { id: record.userId },
    data: { emailVerified: true },
    select: { id: true, email: true, name: true },
  });

  // Delete the token
  await prisma.verificationToken.delete({ where: { id: record.id } });

  // Send welcome email
  const template = welcomeTemplate(user.name || "");
  await sendMail({ to: user.email, ...template });

  // Create welcome notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "welcome",
      title: "Welcome to EDU Passport!",
      body: "Your email has been verified. Start exploring courses, jobs, and events tailored for you.",
      link: "/for-you",
    },
  });

  return NextResponse.json({ success: true, message: "Email verified successfully" });
}
