import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "For You — Personalized Recommendations",
  description:
    "Discover courses, jobs, and events tailored to your interests and learning goals on EDU Passport.",
  path: "/for-you",
  noIndex: true,
});

export default function ForYouLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
