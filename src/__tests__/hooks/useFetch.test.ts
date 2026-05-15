import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFetch } from "@/hooks/useFetch";

describe("useFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes HTTP status for failed responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const { result } = renderHook(() => useFetch<{ ok: boolean }>("/api/user/feed"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("HTTP 401");
    expect(result.current.status).toBe(401);
  });
});
