import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata, jsonLdItemList, SITE_URL } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export const revalidate = 3600;

export const metadata: Metadata = createMetadata({
  title: "All Categories",
  description: "Browse all categories of learning resources and educational tools.",
  path: "/category",
});

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });

  const jsonLd = jsonLdItemList(
    categories.map((cat, i) => ({
      name: cat.name,
      url: `${SITE_URL}/category/${cat.slug}`,
      position: i + 1,
    }))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Categories" }]} />
        <h1 className="text-3xl font-bold mb-2">All Categories</h1>
        <p className="text-muted-foreground mb-8">
          Browse all categories of learning resources and educational tools.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-200 hover:border-primary/20"
            >
              <h2 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1">
                {category.name}
              </h2>
              {category.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {category.description}
                </p>
              )}
              <span className="text-xs text-muted-foreground">
                {category._count.items} {category._count.items === 1 ? "item" : "items"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
