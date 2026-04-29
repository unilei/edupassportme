import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, AI_MODEL } from "@/lib/ai";

interface SearchIntent {
  rewrittenQuery: string;
  type: string | null;
  level: string | null;
  priceRange: string | null;
  suggestion: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query } = body as { query?: string };

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const prompt = `You are a search intent analyzer for an education platform (courses, jobs, events, deals).
Given a user's search query, extract their intent and return a JSON object with:
- rewrittenQuery: a cleaner, more specific search query for full-text search
- type: one of "course", "job", "event", "deal", or null if unclear
- level: one of "beginner", "intermediate", "advanced", or null if not specified
- priceRange: "free", "under50", "under100", or null if not specified
- suggestion: a short (under 20 words) helpful suggestion for the user

User query: "${query}"

Respond ONLY with valid JSON, no markdown.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const intent = JSON.parse(raw) as SearchIntent;

    return NextResponse.json({ intent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
