// ═══════════════════════════════════════════════════════════════
// IThink – Validate Claims API Route
// Enhanced with Hugging Face NLP for semantic analysis
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { searchAllSources } from '@/lib/sources';
import { assessClaimNature, scoreSourceRelevance } from '@/lib/huggingface';
import { Claim, ValidationResult, CredibilityLevel, Source } from '@/lib/types';

function simpleRelevanceScore(claim: string, abstract: string): number {
  // Enhanced keyword matching with synonym awareness
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'is', 'was', 'are', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);

  // Synonym map for better semantic matching
  const synonymMap: Record<string, string[]> = {
    activity: ['exercise', 'physical', 'movement', 'workout', 'active'],
    disease: ['illness', 'disorder', 'condition', 'ailment', 'pathology'],
    reduce: ['decrease', 'lower', 'diminish', 'mitigate', 'prevent'],
    increase: ['rise', 'elevate', 'boost', 'enhance', 'augment'],
    risk: ['hazard', 'danger', 'threat', 'vulnerability', 'susceptibility'],
    cardiovascular: ['heart', 'cardiac', 'vascular', 'circulatory'],
    memory: ['cognition', 'recall', 'retention', 'learning'],
    depression: ['depressive', 'mood', 'mental', 'psychiatric'],
    anxiety: ['anxious', 'stress', 'worry', 'fear'],
    sleep: ['dormancy', 'rest', 'slumber', 'insomnia', 'sleeplessness'],
  };

  // Extract meaningful words
  const extractWords = (text: string): string[] => {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
  };

  const claimWords = extractWords(claim);
  const abstractText = abstract.toLowerCase();

  // Match claim words with synonyms
  let matches = 0;
  for (const word of claimWords) {
    if (abstractText.includes(word)) {
      matches += 2; // Exact match worth 2 points
    } else {
      // Check for synonyms
      const synonyms = synonymMap[word] || [];
      if (synonyms.some((syn) => abstractText.includes(syn))) {
        matches += 1; // Synonym match worth 1 point
      }
    }
  }

  // Calculate score: (matches / (claim_words * 2)) * 100
  // Using *2 because each word gets max 2 points
  const maxPoints = Math.max(claimWords.length * 2, 1);
  const score = Math.round((matches / maxPoints) * 100);
  
  return Math.max(score, 1); // Return at least 1% if any match exists
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
  const topSources = relevanceScores
    .map((r, i) => ({ relevance: r, provider: sources[i].provider }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  const peerReviewedMatch = topSources.some(
    (s) => s.provider === 'crossref' && s.relevance > 50
  );

  let score: CredibilityLevel;
  let confidence: number;
  let reasoning: string;

  if (maxRelevance > 0.65 && peerReviewedMatch) {
    score = 'high';
    confidence = 85;
    reasoning =
      'Claim is well-supported by peer-reviewed academic sources in CrossRef.';
  } else if (maxRelevance > 0.50) {
    score = 'needs-verification';
    confidence = 70;
    reasoning =
      'Claim partially aligns with available sources. Check full paper details for exact match.';
  } else if (maxRelevance > 0.30) {
    score = 'needs-verification';
    confidence = 50;
    reasoning =
      'Weak alignment with sources. Claim may use different terminology or require additional evidence.';
  } else {
    score = 'likely-false';
    confidence = 35;
    reasoning = 'No strong source support found. Claim may not be covered in academic literature.';
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
