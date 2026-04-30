import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { GET } from "@/app/api/search/suggest/route";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/search/suggest");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/search/suggest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty suggestions when query is empty", async () => {
    const res = await GET(makeRequest({}));
    const body = await res.json();

    expect(body.suggestions).toEqual([]);
  });

  it("should return empty suggestions when query is too short", async () => {
    const res = await GET(makeRequest({ q: "a" }));
    const body = await res.json();

    expect(body.suggestions).toEqual([]);
  });

  it("should return suggestions for valid query", async () => {
    mockedPrisma.$queryRawUnsafe.mockResolvedValue([
      { title: "Python Basics", slug: "python-basics", type: "course" },
      { title: "Advanced Python", slug: "advanced-python", type: "course" },
    ]);

    const res = await GET(makeRequest({ q: "python" }));
    const body = await res.json();

    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions[0].title).toBe("Python Basics");
    expect(body.suggestions[0].slug).toBe("python-basics");
    expect(body.suggestions[0].type).toBe("course");
  });

  it("should call prisma with prefix tsquery", async () => {
    mockedPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await GET(makeRequest({ q: "web dev" }));

    expect(mockedPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const call = mockedPrisma.$queryRawUnsafe.mock.calls[0];
    expect(call[1]).toBe("web:* & dev:*");
    expect(call[2]).toBe("active");
    expect(call[0]).toContain(`"status" = $2`);
    expect(call[0]).toContain(`("expiresAt" IS NULL OR "expiresAt" >= NOW())`);
    expect(call[0]).toContain(`("endDate" IS NULL OR "endDate" >= NOW())`);
  });
});
