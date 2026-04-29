import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "My Profile",
  description:
    "Manage your EDU Passport profile, interests, education level, and preferences.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
