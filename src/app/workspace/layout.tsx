import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Opportunity Workspace",
  description:
    "Track saved student opportunities, deadlines, recommendations, and applications on EDU Passport.",
  path: "/workspace",
  noIndex: true,
});

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
