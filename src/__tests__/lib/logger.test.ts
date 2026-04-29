import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages via console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("INFO");
    expect(spy.mock.calls[0][0]).toContain("test message");
  });

  it("logs error messages via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("oops", { code: 500 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("ERROR");
    expect(spy.mock.calls[0][0]).toContain("oops");
  });

  it("logs warn messages via console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("caution");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("WARN");
  });

  it("includes metadata in output", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("with meta", { userId: "u1", action: "login" });
    expect(spy.mock.calls[0][0]).toContain("userId");
    expect(spy.mock.calls[0][0]).toContain("u1");
  });
});
