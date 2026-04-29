import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    expect(result.current).toBe("a");

    rerender({ value: "b", delay: 300 });
    expect(result.current).toBe("a"); // not yet updated

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("b"); // now updated

    vi.useRealTimers();
  });

  it("resets timer on rapid changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "x", delay: 200 } },
    );

    rerender({ value: "y", delay: 200 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "z", delay: 200 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // "y" should have been cancelled
    expect(result.current).toBe("x");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("z");

    vi.useRealTimers();
  });
});
