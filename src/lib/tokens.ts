import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function createVerificationToken(userId: string) {
  // Delete any existing tokens for this user
  await prisma.verificationToken.deleteMany({ where: { userId } });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function createPasswordResetToken(userId: string) {
  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });

  return token;
}
