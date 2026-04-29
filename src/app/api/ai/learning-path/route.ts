import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, AI_MODEL } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

interface PathStep {
  order: number;
  title: string;
  description: string;
  duration: string;
  type: string;
  searchQuery: string;
}

interface LearningPath {
  goal: string;
  estimatedDuration: string;
  steps: PathStep[];
  tips: string[];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { goal, currentLevel, timeCommitment } = body as {
    goal?: string;
    currentLevel?: string;
    timeCommitment?: string;
  };

  if (!goal || goal.trim().length < 5) {
    return NextResponse.json({ error: "Please describe your learning goal" }, { status: 400 });
  }

  // Fetch available course categories for context
  const categories = await prisma.category.findMany({
    select: { name: true },
    orderBy: { sortOrder: "asc" },
  });
  const categoryNames = categories.map((c) => c.name).join(", ");

  const prompt = `You are an expert education advisor for EDU Passport, a platform with courses, jobs, events, and deals.
Available categories: ${categoryNames}

Create a personalized learning path for this goal. Return a JSON object with:
- goal: restate the goal clearly (under 15 words)
- estimatedDuration: total estimated time (e.g. "3-6 months")
- steps: array of 4-6 steps, each with:
  - order: step number (1-based)
  - title: step title (under 10 words)
  - description: what to learn/do (under 30 words)
  - duration: estimated time for this step (e.g. "2 weeks")
  - type: "course", "project", "event", or "job"
  - searchQuery: a search query to find relevant resources on our platform
- tips: array of 2-3 practical tips (under 20 words each)

User's goal: "${goal}"
${currentLevel ? `Current level: ${currentLevel}` : ""}
${timeCommitment ? `Time commitment: ${timeCommitment}` : ""}

Respond ONLY with valid JSON, no markdown.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const path = JSON.parse(raw) as LearningPath;

    return NextResponse.json({ path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
