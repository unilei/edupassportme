import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin login (password only)
    CredentialsProvider({
      id: "admin",
      name: "Admin Login",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.ADMIN_PASSWORD) {
          return { id: "admin", name: "Admin", email: "admin@edupassport.me", role: "admin" };
        }
        return null;
      },
    }),
    // User login (email + password)
    CredentialsProvider({
      id: "user-login",
      name: "User Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.appUser.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        if (user.banned) {
          throw new Error("ACCOUNT_BANNED");
        }

        if (!user.emailVerified) {
          throw new Error("UNVERIFIED_EMAIL");
        }

        return { id: user.id, name: user.name || user.email, email: user.email, role: user.role, tier: user.tier };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        const u = user as unknown as Record<string, unknown>;
        token.role = u.role as string;
        token.tier = (u.tier as string) || "free";
        return token;
      }

      const userId = typeof token.userId === "string" ? token.userId : undefined;
      if (userId && userId !== "admin") {
        const currentUser = await prisma.appUser.findUnique({
          where: { id: userId },
          select: { role: true, tier: true, banned: true },
        });
        if (currentUser) {
          token.role = currentUser.banned ? "user" : currentUser.role;
          token.tier = currentUser.banned ? "free" : currentUser.tier || "free";
          token.banned = currentUser.banned;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as Record<string, unknown>;
        u.id = token.userId;
        u.role = token.role;
        u.tier = token.tier;
      }
      return session;
    },
  },
};
