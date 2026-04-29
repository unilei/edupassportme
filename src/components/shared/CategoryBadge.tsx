import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  name: string;
  slug: string;
}

export function CategoryBadge({ name, slug }: CategoryBadgeProps) {
  return (
    <Link href={`/category/${slug}`}>
      <Badge variant="outline" className="text-xs hover:bg-accent transition-colors">
        {name}
      </Badge>
    </Link>
  );
}
