import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata, jsonLdBreadcrumb, SITE_URL } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGrid } from "@/components/item/ItemGrid";
import { ItemPagination } from "@/components/shared/Pagination";

export const revalidate = 3600;
const ITEMS_PER_PAGE = 12;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return createMetadata({
    title: category.name,
    description: category.description || `Browse all ${category.name} learning resources and educational tools.`,
    path: `/category/${category.slug}`,
  });
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const totalItems = await prisma.item.count({
    where: { categoryId: category.id },
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const items = await prisma.item.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });

  const breadcrumbJsonLd = jsonLdBreadcrumb([
    { name: "Home", url: SITE_URL },
    { name: "Categories", url: `${SITE_URL}/category` },
    { name: category.name, url: `${SITE_URL}/category/${category.slug}` },
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
            { label: "Categories", href: "/category" },
            { label: category.name },
          ]}
        />
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mb-8">{category.description}</p>
        )}
        <ItemGrid items={items} />
        <div className="mt-8">
          <ItemPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/category/${slug}`}
          />
        </div>
      </div>
    </>
  );
}
