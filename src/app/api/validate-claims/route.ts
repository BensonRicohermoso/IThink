// ═══════════════════════════════════════════════════════════════
// IThink – Validate Claims API Route
// Enhanced with Hugging Face NLP for semantic analysis
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/gemini';
import { searchAllSources } from '@/lib/sources';
import { assessClaimNature, scoreSourceRelevance } from '@/lib/huggingface';
import { Claim, ValidationResult, CredibilityLevel } from '@/lib/types';

interface AIValidation {
  score: 'high' | 'needs-verification' | 'likely-false';
  confidence: number;
  summary: string;
  reasoning: string;
}

export async function POST(req: NextRequest) {
  try {
    const { claims } = await req.json() as { claims: Claim[] };

    if (!claims || claims.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results: ValidationResult[] = [];

    for (const claim of claims.slice(0, 10)) {
      try {
        // Step 1: Search for sources related to the claim
        const sources = await searchAllSources(claim.text, 3);

        // Step 2: HF — Classify claim type (factual / opinion / speculation)
        let claimNature = { type: 'unknown', confidence: 0 };
        try {
          claimNature = await assessClaimNature(claim.text);
        } catch (hfErr) {
          console.warn('HF claim nature assessment skipped:', hfErr);
        }

        // Step 3: HF — Score source relevance via semantic similarity
        let relevanceScores: number[] = [];
        try {
          const abstracts = sources
            .filter((s) => s.abstract)
            .map((s) => s.abstract!.slice(0, 300));
          if (abstracts.length > 0) {
            relevanceScores = await scoreSourceRelevance(claim.text, abstracts);
          }
        } catch (hfErr) {
          console.warn('HF relevance scoring skipped:', hfErr);
        }

        // Step 4: Gemini — Full credibility evaluation with HF enrichment
        const sourceContext = sources
          .map((s, i) => {
            const relevance = relevanceScores[i] !== undefined
              ? ` [Semantic Relevance: ${relevanceScores[i]}%]`
              : '';
            return `Source ${i + 1}: "${s.title}" by ${s.authors.join(', ')} (${s.year})${relevance}${s.abstract ? ` — ${s.abstract.slice(0, 200)}` : ''}`;
          })
          .join('\n');

        const hfContext = claimNature.type !== 'unknown'
          ? `\nNLP ANALYSIS: This claim is classified as "${claimNature.type}" with ${claimNature.confidence}% confidence.`
          : '';

        const prompt = `You are IThink, an academic credibility evaluator. Evaluate the following claim based on the sources found and NLP analysis.

CLAIM: "${claim.text}"
${claim.citation ? `CITED AS: ${claim.citation}` : 'No citation provided'}
${hfContext}

FOUND SOURCES:
${sourceContext || 'No sources found'}

Evaluate the credibility and return a JSON object:
{
  "score": "high" | "needs-verification" | "likely-false",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence summary of how this claim relates to current research>",
  "reasoning": "<brief explanation of why you assigned this credibility score>"
}

Scoring rules:
- "high": Claim is well-supported by peer-reviewed sources and classified as factual/research finding
- "needs-verification": Claim is plausible but needs more evidence, or is classified as speculative
- "likely-false": Claim contradicts available evidence, has no supporting sources, or is classified as opinion presented as fact`;

        const validation = await generateJSON<AIValidation>(prompt);

        results.push({
          claimId: claim.id,
          score: validation.score as CredibilityLevel,
          confidence: validation.confidence,
          sources,
          summary: validation.summary,
          reasoning: `${validation.reasoning}${claimNature.type !== 'unknown' ? ` [NLP: ${claimNature.type}, ${claimNature.confidence}% confidence]` : ''}`,
        });
      } catch (err) {
        console.error(`Validation error for claim ${claim.id}:`, err);
        results.push({
          claimId: claim.id,
          score: 'needs-verification',
          confidence: 0,
          sources: [],
          summary: 'Unable to validate this claim at this time.',
          reasoning: 'Validation service encountered an error.',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Validate claims error:', error);
    return NextResponse.json(
      { error: 'Failed to validate claims', results: [] },
      { status: 500 }
    );
  }
}
