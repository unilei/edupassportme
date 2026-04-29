import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Sign Up",
  description: "Create a free EDU Passport account to save listings, get personalized recommendations, and track applications.",
  path: "/auth/signup",
  noIndex: true,
});

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
