import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Saved Listings",
  description:
    "View and manage your saved courses, jobs, events, and deals on EDU Passport.",
  path: "/saved",
  noIndex: true,
});

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
