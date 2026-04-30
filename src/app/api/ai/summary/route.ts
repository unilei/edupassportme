import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI, AI_MODEL } from "@/lib/ai";
import { activeListingWhere } from "@/lib/listing-visibility";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug } = body as { slug?: string };

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: { slug, ...activeListingWhere() },
    select: {
      title: true,
      type: true,
      description: true,
      content: true,
      price: true,
      priceLabel: true,
      rating: true,
      reviewCount: true,
      duration: true,
      level: true,
      location: true,
      provider: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const tagNames = listing.tags.map((t) => t.tag.name).join(", ");
  const priceStr = listing.priceLabel || (listing.price === 0 || listing.price === null ? "Free" : `$${listing.price}`);

  const prompt = `You are an expert education advisor. Summarize this ${listing.type} listing concisely for a student considering it. Include key strengths, who it's best for, and any caveats. Keep it under 150 words.

Title: ${listing.title}
Provider: ${listing.provider.name}
Type: ${listing.type}
Price: ${priceStr}
${listing.rating ? `Rating: ${listing.rating}/5 (${listing.reviewCount || 0} reviews)` : ""}
${listing.duration ? `Duration: ${listing.duration}` : ""}
${listing.level ? `Level: ${listing.level}` : ""}
${listing.location ? `Location: ${listing.location}` : ""}
${tagNames ? `Tags: ${tagNames}` : ""}

Description: ${listing.description}
${listing.content ? `\nDetails: ${listing.content.slice(0, 500)}` : ""}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
