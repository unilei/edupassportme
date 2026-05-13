import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "All Tags",
  description: "Browse all tags to find learning resources and educational tools by topic.",
  path: "/tag",
});

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Tags" }]} />
      <h1 className="text-3xl font-bold mb-2">All Tags</h1>
      <p className="text-muted-foreground mb-8">
        Browse all tags to find learning resources and educational tools by topic.
      </p>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link key={tag.slug} href={`/tag/${tag.slug}`}>
            <Badge
              variant="secondary"
              className="text-sm px-4 py-2 hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              {tag.name}
              <span className="ml-2 text-muted-foreground">({tag._count.items})</span>
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
