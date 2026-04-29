import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Sign In",
  description: "Sign in to your EDU Passport account to access saved listings, recommendations, and more.",
  path: "/auth/signin",
  noIndex: true,
});

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
