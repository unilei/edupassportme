import { useState, useCallback } from "react";

interface UsePaginationResult {
  page: number;
  setPage: (p: number) => void;
  next: () => void;
  prev: () => void;
  canNext: boolean;
  canPrev: boolean;
}

export function usePagination(totalPages: number, initial = 1): UsePaginationResult {
  const [page, setPageRaw] = useState(initial);

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.max(1, Math.min(totalPages, p))),
    [totalPages],
  );

  const next = useCallback(() => setPage(page + 1), [page, setPage]);
  const prev = useCallback(() => setPage(page - 1), [page, setPage]);

  return {
    page,
    setPage,
    next,
    prev,
    canNext: page < totalPages,
    canPrev: page > 1,
  };
}
