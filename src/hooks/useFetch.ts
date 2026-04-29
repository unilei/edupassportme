import { useEffect, useReducer, useCallback } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Action<T> =
  | { type: "fetch" }
  | { type: "success"; data: T }
  | { type: "error"; error: string };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "fetch":
      return { ...state, loading: true, error: null };
    case "success":
      return { data: action.data, loading: false, error: null };
    case "error":
      return { ...state, loading: false, error: action.error };
  }
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [state, dispatch] = useReducer(reducer<T>, {
    data: null,
    loading: !!url,
    error: null,
  });
  const [key, setKey] = useReducer((k: number) => k + 1, 0);

  const reload = useCallback(() => setKey(), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    dispatch({ type: "fetch" });

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: T) => {
        if (!cancelled) dispatch({ type: "success", data: d });
      })
      .catch((e: Error) => {
        if (!cancelled) dispatch({ type: "error", error: e.message });
      });

    return () => {
      cancelled = true;
    };
  }, [url, key]);

  return { data: state.data, loading: state.loading, error: state.error, reload };
}
