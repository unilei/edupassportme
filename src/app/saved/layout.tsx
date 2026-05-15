import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Saved Opportunities",
  description:
    "View, prioritize, and track your saved student opportunities on EDU Passport.",
  path: "/saved",
  noIndex: true,
});

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
