import { ItemCard } from "./ItemCard";

type ItemWithRelations = {
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

interface ItemGridProps {
  items: ItemWithRelations[];
}

export function ItemGrid({ items }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No items found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <ItemCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
