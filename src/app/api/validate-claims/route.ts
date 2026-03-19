// ═══════════════════════════════════════════════════════════════
// IThink – Validate Claims API Route
// Enhanced with Hugging Face NLP for semantic analysis
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { searchAllSources } from '@/lib/sources';
import { assessClaimNature, scoreSourceRelevance } from '@/lib/huggingface';
import { Claim, ValidationResult, CredibilityLevel, Source } from '@/lib/types';

function simpleRelevanceScore(claim: string, abstract: string): number {
  // Fallback keyword matching when HF is unavailable
  const claimWords = new Set(claim.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const abstractWords = new Set(abstract.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  
  const matches = [...claimWords].filter((w) => abstractWords.has(w)).length;
  const score = (matches / Math.max(claimWords.size, 1)) * 100;
  return Math.min(score, 95); // Cap at 95% to indicate it's heuristic
}

function calculateCredibilityScore(
  claimText: string,
  sources: Source[],
  relevanceScores: number[]
): { score: CredibilityLevel; confidence: number; reasoning: string } {
  if (sources.length === 0) {
    return {
      score: 'needs-verification' as CredibilityLevel,
      confidence: 20,
      reasoning: 'No supporting sources found. Claim may be niche or not yet published.',
    };
  }

  // Calculate max relevance score from sources
  const maxRelevance = Math.max(...relevanceScores.map((r) => r / 100));
  const peerReviewedMatch = sources.some(
    (s, i) => s.provider === 'crossref' && relevanceScores[i] > 70
  );

  let score: CredibilityLevel;
  let confidence: number;
  let reasoning: string;

  if (maxRelevance > 0.75 && peerReviewedMatch) {
    score = 'high';
    confidence = 85;
    reasoning =
      'Claim aligns closely with peer-reviewed academic sources found in CrossRef.';
  } else if (maxRelevance > 0.60) {
    score = 'needs-verification';
    confidence = 65;
    reasoning =
      'Moderate match with available sources. More recent or authoritative sources recommended.';
  } else if (maxRelevance > 0.40) {
    score = 'needs-verification';
    confidence = 45;
    reasoning =
      'Weak match with sources. Claim specificity may differ from existing literature.';
  } else {
    score = 'likely-false';
    confidence = 30;
    reasoning = 'Found relevant sources but none strongly support this claim.';
  }

  return { score, confidence, reasoning };
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

        // Fallback: use simple keyword matching if HF scores are all zero
        if (relevanceScores.length === 0 || relevanceScores.every((s) => s === 0)) {
          relevanceScores = sources
            .filter((s) => s.abstract)
            .map((s) => simpleRelevanceScore(claim.text, s.abstract!));
        }

        // Step 4: Local heuristic credibility scoring (no LLM needed)
        const credibilityAssessment = calculateCredibilityScore(claim.text, sources, relevanceScores);

        const nplContext = claimNature.type !== 'unknown'
          ? `NLP Classification: ${claimNature.type} (${claimNature.confidence}% confidence)`
          : '';

        const summary =
          sources.length > 0
            ? `This claim ${credibilityAssessment.score === 'high' ? 'aligns well with' : credibilityAssessment.score === 'needs-verification' ? 'partially matches' : 'does not align with'} ${sources.length} academic source(s) found in CrossRef and arXiv. The strongest match shows ${Math.max(...relevanceScores, 0)}% semantic similarity.`
            : 'No academic sources currently found. Unable to verify claim against peer-reviewed literature.';

        results.push({
          claimId: claim.id,
          score: credibilityAssessment.score,
          confidence: credibilityAssessment.confidence,
          sources,
          summary,
          reasoning: `${credibilityAssessment.reasoning}${nplContext ? ` | ${nplContext}` : ''}`
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
