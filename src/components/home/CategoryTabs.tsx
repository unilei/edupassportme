"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CategoryTabsProps {
  groups: string[];
  activeGroup: string;
}

export function CategoryTabs({ groups, activeGroup }: CategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (group: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (group === "all") {
      params.delete("group");
    } else {
      params.set("group", group);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Button
        variant={activeGroup === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => handleClick("all")}
      >
        All Categories
      </Button>
      {groups.map((group) => (
        <Button
          key={group}
          variant={activeGroup === group ? "default" : "outline"}
          size="sm"
          onClick={() => handleClick(group)}
        >
          {group}
        </Button>
      ))}
    </div>
  );
}
