import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createMetadata, jsonLdSoftwareApplication, jsonLdBreadcrumb, SITE_URL } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { TagBadge } from "@/components/shared/TagBadge";
import { Button } from "@/components/ui/button";
import { ItemGrid } from "@/components/item/ItemGrid";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const items = await prisma.item.findMany({ select: { slug: true } });
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await prisma.item.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!item) return {};
  return createMetadata({
    title: item.name,
    description: item.description,
    path: `/item/${item.slug}`,
  });
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await prisma.item.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });

  if (!item) notFound();

  const relatedItems = await prisma.item.findMany({
    where: {
      categoryId: item.categoryId,
      id: { not: item.id },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });

  const breadcrumbJsonLd = jsonLdBreadcrumb([
    { name: "Home", url: SITE_URL },
    { name: item.category.name, url: `${SITE_URL}/category/${item.category.slug}` },
    { name: item.name, url: `${SITE_URL}/item/${item.slug}` },
  ]);

  const softwareJsonLd = jsonLdSoftwareApplication({
    name: item.name,
    description: item.description,
    url: item.url,
    category: item.category.name,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: "Categories", href: "/category" },
            { label: item.category.name, href: `/category/${item.category.slug}` },
            { label: item.name },
          ]}
        />

        <article className="max-w-3xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="relative h-16 w-16 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
              {item.icon ? (
                <Image
                  src={item.icon}
                  alt={`${item.name} icon`}
                  width={64}
                  height={64}
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {item.name[0]}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{item.name}</h1>
              <div className="flex items-center gap-2 mb-3">
                <CategoryBadge name={item.category.name} slug={item.category.slug} />
              </div>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Website
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/category/${item.category.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                More in {item.category.name}
              </Link>
            </Button>
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {item.tags.map(({ tag }) => (
                <TagBadge key={tag.slug} name={tag.name} slug={tag.slug} />
              ))}
            </div>
          )}

          {item.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
              <div dangerouslySetInnerHTML={{ __html: item.content }} />
            </div>
          )}
        </article>

        {relatedItems.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-bold mb-6">Related Tools</h2>
            <ItemGrid items={relatedItems} />
          </section>
        )}
      </div>
    </>
  );
}
