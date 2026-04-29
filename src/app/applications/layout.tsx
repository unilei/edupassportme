import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "My Applications",
  description:
    "Track your job applications submitted through EDU Passport Quick Apply. View status updates and manage your applications.",
  path: "/applications",
  noIndex: true,
});

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
