"use client";

import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
}

function buildUrl(basePath: string, page: number, searchParams?: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ItemPagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationPrevious href={buildUrl(basePath, currentPage - 1, searchParams)} />
          ) : (
            <PaginationPrevious className="pointer-events-none opacity-50" href="#" />
          )}
        </PaginationItem>
        {pages.map((page, i) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href={buildUrl(basePath, page, searchParams)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationNext href={buildUrl(basePath, currentPage + 1, searchParams)} />
          ) : (
            <PaginationNext className="pointer-events-none opacity-50" href="#" />
          )}
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
