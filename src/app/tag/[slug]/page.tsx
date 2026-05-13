import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata, jsonLdBreadcrumb, SITE_URL } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGrid } from "@/components/item/ItemGrid";
import { ItemPagination } from "@/components/shared/Pagination";

export const dynamic = "force-dynamic";
const ITEMS_PER_PAGE = 12;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return {};
  return createMetadata({
    title: `${tag.name} Resources`,
    description: `Discover the best ${tag.name} learning resources and educational tools.`,
    path: `/tag/${tag.slug}`,
  });
}

export default async function TagDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));

  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const totalItems = await prisma.itemTag.count({
    where: { tagId: tag.id },
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const itemTags = await prisma.itemTag.findMany({
    where: { tagId: tag.id },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
    include: {
      item: {
        include: {
          category: { select: { name: true, slug: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      },
    },
    orderBy: { item: { createdAt: "desc" } },
  });

  const items = itemTags.map((it) => it.item);

  const breadcrumbJsonLd = jsonLdBreadcrumb([
    { name: "Home", url: SITE_URL },
    { name: "Tags", url: `${SITE_URL}/tag` },
    { name: tag.name, url: `${SITE_URL}/tag/${tag.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: "Tags", href: "/tag" },
            { label: tag.name },
          ]}
        />
        <h1 className="text-3xl font-bold mb-2">{tag.name}</h1>
        <p className="text-muted-foreground mb-8">
          Learning resources and educational tools tagged with &ldquo;{tag.name}&rdquo;.
        </p>
        <ItemGrid items={items} />
        <div className="mt-8">
          <ItemPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/tag/${slug}`}
          />
        </div>
      </div>
    </>
  );
}
