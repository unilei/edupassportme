import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { TagBadge } from "@/components/shared/TagBadge";

interface ItemCardProps {
  item: {
    name: string;
    slug: string;
    url: string;
    description: string;
    icon: string | null;
    category: {
      name: string;
      slug: string;
    };
    tags: {
      tag: {
        name: string;
        slug: string;
      };
    }[];
  };
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="group rounded-xl border bg-card p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="relative h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {item.icon ? (
            <Image
              src={item.icon}
              alt={`${item.name} icon`}
              width={40}
              height={40}
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {item.name[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/item/${item.slug}`}
              className="font-semibold text-sm hover:text-primary transition-colors truncate"
            >
              {item.name}
            </Link>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Visit ${item.name}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-1">
            <CategoryBadge name={item.category.name} slug={item.category.slug} />
          </div>
        </div>
      </div>
      <Link href={`/item/${item.slug}`} className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description}
        </p>
      </Link>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {item.tags.slice(0, 4).map(({ tag }) => (
            <TagBadge key={tag.slug} name={tag.name} slug={tag.slug} />
          ))}
        </div>
      )}
    </article>
  );
}
