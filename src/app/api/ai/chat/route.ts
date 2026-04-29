import { NextRequest } from "next/server";
import { getOpenAI, AI_MODEL } from "@/lib/ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are EDU Passport AI, a helpful education advisor. You help users find courses, jobs, events, and deals on the EDU Passport platform.

Key capabilities:
- Recommend courses based on user goals and experience level
- Suggest learning paths for career transitions
- Compare education platforms (Coursera, Udemy, edX, etc.)
- Help find relevant jobs in education/tech
- Advise on certifications and skill development

Guidelines:
- Be concise and actionable (under 200 words per response)
- When suggesting resources, mention they can search on EDU Passport
- Use markdown formatting for clarity
- If asked about pricing, mention users can compare prices on the platform
- Be encouraging and supportive`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body as {
    messages?: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Limit conversation history to last 10 messages
  const trimmedMessages = messages.slice(-10);

  try {
    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...trimmedMessages,
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
