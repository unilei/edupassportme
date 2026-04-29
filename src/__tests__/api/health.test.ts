import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { GET } from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with status ok when DB is reachable", async () => {
    mockedPrisma.$queryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeDefined();
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(body.checks.memory).toBeDefined();
  });

  it("should return 503 when DB is unreachable", async () => {
    mockedPrisma.$queryRawUnsafe.mockRejectedValue(new Error("Connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.checks.database.status).toBe("error");
    expect(body.checks.database.message).toBe("Database unreachable");
  });
});
