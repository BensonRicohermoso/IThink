// ═══════════════════════════════════════════════════════════════
// IThink – Summarize API Route
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';
import { Source } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { claim, sources } = await req.json() as { claim: string; sources: Source[] };

    if (!claim) {
      return NextResponse.json({ summary: 'No claim provided.' });
    }

    const sourceContext = sources
      ?.map((s, i) => `[${i + 1}] "${s.title}" (${s.year}) — ${s.abstract?.slice(0, 300) || 'No abstract available'}`)
      .join('\n\n') || 'No sources available.';

    const prompt = `You are IThink, an academic research summarizer. Provide a concise, well-structured summary of the following claim based on the given sources.

CLAIM: "${claim}"

SOURCES:
${sourceContext}

Instructions:
- Summarize the key insights from the sources that relate to this claim
- Highlight agreements and disagreements between sources
- Note any additional context or caveats
- Keep the summary to 3-5 sentences
- Use an academic but accessible tone
- Reference sources by their number [1], [2], etc.`;

    const summary = await generateText(prompt);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', summary: 'Summary unavailable.' },
      { status: 500 }
    );
  }
}
