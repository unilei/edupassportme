import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Pricing — Free vs Pro",
  description:
    "Compare EDU Passport Free and Pro plans. Unlock unlimited saves, ad-free browsing, Quick Apply for jobs, and more.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
