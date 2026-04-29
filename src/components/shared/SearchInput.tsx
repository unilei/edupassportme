"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface Suggestion {
  title: string;
  slug: string;
  type: string;
}

interface SearchInputProps {
  defaultValue?: string;
  placeholder?: string;
  size?: "default" | "lg";
}

export function SearchInput({
  defaultValue = "",
  placeholder = "Search courses, tools, platforms...",
  size = "default",
}: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    timerRef.current = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { suggestions: Suggestion[] }) => {
          setSuggestions(data.suggestions);
          setShowSuggestions(data.suggestions.length > 0);
          setActiveIdx(-1);
        })
        .catch(() => setSuggestions([]));
    }, 200);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const s = suggestions[activeIdx];
      setShowSuggestions(false);
      router.push(`/listing/${s.slug}`);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const typeLabel: Record<string, string> = {
    course: "Course",
    job: "Job",
    event: "Event",
    deal: "Deal",
  };

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${size === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
          <Input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className={`${size === "lg" ? "h-12 pl-11 text-base" : "h-10 pl-10"}`}
            autoComplete="off"
          />
        </div>
        <Button type="submit" className={size === "lg" ? "h-12 px-6" : ""}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border bg-card shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <Link
              key={s.slug}
              href={`/listing/${s.slug}`}
              onClick={() => setShowSuggestions(false)}
              className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                i === activeIdx ? "bg-muted" : ""
              }`}
            >
              <span className="truncate">{s.title}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {typeLabel[s.type] || s.type}
              </span>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setShowSuggestions(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted border-t transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Search all for &ldquo;{query}&rdquo;
          </Link>
        </div>
      )}
    </div>
  );
}
