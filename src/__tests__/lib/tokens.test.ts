import { describe, it, expect } from "vitest";
import { generateToken } from "@/lib/tokens";

describe("tokens", () => {
  describe("generateToken", () => {
    it("should return a 64-character hex string", () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens each time", () => {
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toBe(t2);
    });
  });
});
