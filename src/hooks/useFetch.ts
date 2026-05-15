import { useEffect, useReducer, useCallback } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number | null;
}

type Action<T> =
  | { type: "fetch" }
  | { type: "success"; data: T }
  | { type: "error"; error: string; status?: number };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "fetch":
      return { ...state, loading: true, error: null, status: null };
    case "success":
      return { data: action.data, loading: false, error: null, status: 200 };
    case "error":
      return { ...state, loading: false, error: action.error, status: action.status ?? null };
  }
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number | null;
  reload: () => void;
}

export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [state, dispatch] = useReducer(reducer<T>, {
    data: null,
    loading: !!url,
    error: null,
    status: null,
  });
  const [key, setKey] = useReducer((k: number) => k + 1, 0);

  const reload = useCallback(() => setKey(), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    dispatch({ type: "fetch" });

    fetch(url)
      .then((r) => {
        if (!r.ok) {
          const error = new Error(`HTTP ${r.status}`) as Error & { status?: number };
          error.status = r.status;
          throw error;
        }
        return r.json();
      })
      .then((d: T) => {
        if (!cancelled) dispatch({ type: "success", data: d });
      })
      .catch((e: Error & { status?: number }) => {
        if (!cancelled) dispatch({ type: "error", error: e.message, status: e.status });
      });

    return () => {
      cancelled = true;
    };
  }, [url, key]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    status: state.status,
    reload,
  };
}
