"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

interface FilterBarProps {
  tags: { name: string; slug: string }[];
  activeTag: string;
  activeSort: string;
}

export function FilterBar({ tags, activeTag, activeSort }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const resetFilters = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <Select
        value={activeTag || "all"}
        onValueChange={(val) => updateParam("tag", val)}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="Select tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag.slug} value={tag.slug}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeSort || "newest"}
        onValueChange={(val) => updateParam("sort", val)}
      >
        <SelectTrigger className="w-45 h-9">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Sort by Time (desc)</SelectItem>
          <SelectItem value="oldest">Sort by Time (asc)</SelectItem>
          <SelectItem value="name">Sort by Name</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" onClick={resetFilters}>
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Reset
      </Button>
    </div>
  );
}
