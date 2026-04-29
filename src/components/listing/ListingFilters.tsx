"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface ListingFiltersProps {
  basePath: string;
  providers?: FilterOption[];
  levels?: FilterOption[];
  sortOptions?: FilterOption[];
  showPriceFilter?: boolean;
  searchPlaceholder?: string;
}

export function ListingFilters({
  basePath,
  providers,
  levels,
  sortOptions,
  showPriceFilter = false,
  searchPlaceholder = "Search...",
}: ListingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentProvider = searchParams.get("provider") || "";
  const currentLevel = searchParams.get("level") || "";
  const currentPriceMax = searchParams.get("priceMax") || "";

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const merged = {
        q: currentQ,
        sort: currentSort,
        provider: currentProvider,
        level: currentLevel,
        priceMax: currentPriceMax,
        ...overrides,
      };
      for (const [k, v] of Object.entries(merged)) {
        if (v && k !== "page") params.set(k, v);
      }
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    },
    [basePath, currentQ, currentSort, currentProvider, currentLevel, currentPriceMax]
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = (fd.get("q") as string) || "";
    router.push(buildUrl({ q }));
  };

  const defaultSort = sortOptions?.[0]?.value ?? "rating";

  return (
    <div className="space-y-3 mb-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            defaultValue={currentQ}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          <SlidersHorizontal className="h-4 w-4 mr-1" /> Filter
        </Button>
      </form>

      {/* Filter chips row */}
      <div className="flex flex-wrap gap-2 text-xs">
        {/* Sort */}
        {sortOptions && sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1">Sort:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl({ sort: opt.value === defaultSort ? "" : opt.value }))}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  (currentSort || defaultSort) === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Provider */}
        {providers && providers.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground ml-2 mr-1">Provider:</span>
            <button
              onClick={() => router.push(buildUrl({ provider: "" }))}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                !currentProvider
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              All
            </button>
            {providers.map((opt) => (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl({ provider: opt.value }))}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  currentProvider === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {opt.label}{opt.count !== undefined ? ` (${opt.count})` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Level */}
        {levels && levels.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground ml-2 mr-1">Level:</span>
            <button
              onClick={() => router.push(buildUrl({ level: "" }))}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                !currentLevel
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              All
            </button>
            {levels.map((opt) => (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl({ level: opt.value }))}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  currentLevel === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Price max */}
        {showPriceFilter && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground ml-2 mr-1">Max Price:</span>
            {["", "0", "20", "50", "100"].map((v) => (
              <button
                key={v}
                onClick={() => router.push(buildUrl({ priceMax: v }))}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  currentPriceMax === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {v === "" ? "Any" : v === "0" ? "Free" : `≤$${v}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
