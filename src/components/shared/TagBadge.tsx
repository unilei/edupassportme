import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  name: string;
  slug: string;
}

export function TagBadge({ name, slug }: TagBadgeProps) {
  return (
    <Link href={`/tag/${slug}`}>
      <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors">
        {name}
      </Badge>
    </Link>
  );
}
