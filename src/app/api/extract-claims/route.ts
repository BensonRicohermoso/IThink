// ═══════════════════════════════════════════════════════════════
// IThink – Extract Claims API Route
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/gemini';
import { Claim } from '@/lib/types';

interface ExtractResponse {
  claims: Array<{
    text: string;
    citation?: string;
    startIndex: number;
    endIndex: number;
  }>;
}

function isLikelyClaimSentence(sentence: string, claimPatterns: RegExp[]): boolean {
  if (claimPatterns.some((pattern) => pattern.test(sentence))) {
    return true;
  }

  // Fallback: capture longer declarative assertions when no strong claim markers exist.
  const looksSubjective = /\b(i think|we think|i believe|we believe|in my opinion|our opinion|should|could|might)\b/i.test(sentence);
  const startsLikeInstruction = /^\s*(write|explain|analyze|discuss|summarize|list|describe)\b/i.test(sentence);
  const wordCount = sentence.trim().split(/\s+/).length;
  const isQuestion = sentence.trim().endsWith('?');

  return wordCount >= 5 && !looksSubjective && !startsLikeInstruction && !isQuestion;
}

function extractClaimsHeuristic(text: string): Claim[] {
  const protectedText = text
    .replace(/\bet al\./gi, 'et al§')
    .replace(/\be\.g\./gi, 'e§g§')
    .replace(/\bi\.e\./gi, 'i§e§')
    .replace(/\betc\./gi, 'etc§')
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof)\./g, '$1§');

  const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
  const matches = [...protectedText.matchAll(sentenceRegex)];
  const claimPatterns: RegExp[] = [
    /\b\d+(?:\.\d+)?%\b/i,
    /\b(study|studies|research|meta-analysis|trial|evidence|data|report)\b/i,
    /\b(increases?|decreases?|reduces?|improves?|worsens?|causes?|leads to|correlates? with)\b/i,
    /\b(according to|found that|demonstrates?|indicates?|suggests?)\b/i,
    /\(([^)]+,\s*\d{4})\)|\[\d+\]/,
  ];

  const claims: Claim[] = [];

  for (let idx = 0; idx < matches.length; idx++) {
    const m = matches[idx];
    const sentence = m[0].replace(/§/g, '.');
    const rawStart = m.index ?? 0;
    const trimmed = sentence.trim();
    if (!trimmed || trimmed.length < 25) continue;

    const looksLikeClaim = isLikelyClaimSentence(trimmed, claimPatterns);
    if (!looksLikeClaim) continue;

    const leadingWhitespace = sentence.search(/\S/);
    const startIndex = rawStart + (leadingWhitespace > -1 ? leadingWhitespace : 0);
    const endIndex = startIndex + trimmed.length;
    const citationMatch = trimmed.match(/\(([^)]+,\s*\d{4})\)|\[\d+\]/);

    claims.push({
      id: `fallback-claim-${idx}-${Date.now()}`,
      text: trimmed,
      citation: citationMatch ? citationMatch[0] : undefined,
      startIndex,
      endIndex,
    });
  }

  return claims.slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ claims: [] });
    }

    const prompt = `You are IThink, an academic research assistant. Analyze the following text and extract all factual claims that can be verified.

For each claim, identify:
1. The exact claim text (the sentence or phrase making a factual assertion)
2. Any in-text citation associated with it (e.g., "(Smith, 2020)" or "[1]")
3. The approximate character position where the claim starts and ends in the original text

Return a JSON object with this structure:
{
  "claims": [
    {
      "text": "the factual claim text",
      "citation": "the citation if present, or null",
      "startIndex": 0,
      "endIndex": 50
    }
  ]
}

Rules:
- Only extract verifiable factual claims, not opinions or subjective statements
- Include statistical claims, research findings, and definitive assertions
- Do NOT extract questions, instructions, or meta-statements about writing
- If no claims are found, return {"claims": []}
- Be precise with startIndex and endIndex — they should match the claim's position in the text

TEXT TO ANALYZE:
"""
${text}
"""`;

    let claims: Claim[] = [];

    try {
      const result = await generateJSON<ExtractResponse>(prompt);
      claims = (result.claims || []).map((c, idx) => ({
        ...c,
        id: `claim-${idx}-${Date.now()}`,
      }));
    } catch (llmError) {
      console.warn('LLM extraction unavailable, using heuristic fallback:', llmError);
      claims = extractClaimsHeuristic(text);
    }

    if (claims.length === 0) {
      claims = extractClaimsHeuristic(text);
    }

    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Extract claims error:', error);
    return NextResponse.json(
      { error: 'Failed to extract claims', claims: [] },
      { status: 500 }
    );
  }
}
