// ═══════════════════════════════════════════════════════════════
// IThink – Hugging Face NLP Client
// Uses HF Inference API for NLP tasks: text classification,
// NER (claim detection), semantic similarity, and summarization.
// ═══════════════════════════════════════════════════════════════

import { HfInference } from '@huggingface/inference';

interface HFZeroShotResult {
  labels?: string[];
  scores?: number[];
}

interface HFTokenClassificationItem {
  entity_group?: string;
  entity?: string;
  word?: string;
  score?: number;
  start?: number;
  end?: number;
}

const token = process.env.HUGGINGFACE_API_KEY;

if (!token) {
  console.warn('⚠️ HUGGINGFACE_API_KEY not set in .env.local');
}

const hf = new HfInference(token || '');

// ─── Zero-Shot Classification ────────────────────────
// Classify text into categories (e.g., factual claim vs opinion)
export async function classifyText(
  text: string,
  candidateLabels: string[]
): Promise<{ labels: string[]; scores: number[] }> {
  try {
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text,
      parameters: { candidate_labels: candidateLabels },
    }) as HFZeroShotResult | HFZeroShotResult[];

    // HF returns an array; first element is our result
    const r: HFZeroShotResult = Array.isArray(result) ? (result[0] || {}) : (result || {});
    return {
      labels: r?.labels || [],
      scores: r?.scores || [],
    };
  } catch (err) {
    console.error('HF classification error:', err);
    return { labels: candidateLabels, scores: candidateLabels.map(() => 0) };
  }
}

// ─── Sentence Similarity ────────────────────────────
// Compare how similar a claim is to a source abstract
export async function computeSimilarity(
  source: string,
  sentences: string[]
): Promise<number[]> {
  try {
    const result = await hf.sentenceSimilarity({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: {
        source_sentence: source,
        sentences,
      },
    });

    return Array.isArray(result) ? result : [result];
  } catch (err) {
    console.error('HF similarity error:', err);
    return sentences.map(() => 0);
  }
}

// ─── Summarization ──────────────────────────────────
// Summarize long text (e.g., source abstracts)
export async function summarizeText(
  text: string,
  maxLength: number = 150
): Promise<string> {
  try {
    const result = await hf.summarization({
      model: 'facebook/bart-large-cnn',
      inputs: text,
      parameters: {
        max_length: maxLength,
        min_length: 30,
      },
    });

    return result.summary_text || '';
  } catch (err) {
    console.error('HF summarization error:', err);
    return '';
  }
}

// ─── NER / Token Classification ─────────────────────
// Detect named entities that may indicate factual claims
export async function detectEntities(
  text: string
): Promise<Array<{ entity_group: string; word: string; score: number; start: number; end: number }>> {
  try {
    const result = await hf.tokenClassification({
      model: 'dslim/bert-base-NER',
      inputs: text,
    }) as HFTokenClassificationItem[];

    return (result || []).map((r) => ({
      entity_group: r.entity_group || r.entity || '',
      word: r.word || '',
      score: r.score || 0,
      start: r.start || 0,
      end: r.end || 0,
    }));
  } catch (err) {
    console.error('HF NER error:', err);
    return [];
  }
}

// ─── Claim Credibility Boost ────────────────────────
// Use zero-shot to assess if a claim is factual/opinion/speculation
export async function assessClaimNature(
  claimText: string
): Promise<{ type: string; confidence: number }> {
  const labels = ['factual statement', 'opinion', 'speculation', 'statistical claim', 'research finding'];
  const result = await classifyText(claimText, labels);

  if (result.labels.length > 0 && result.scores.length > 0) {
    return {
      type: result.labels[0],
      confidence: Math.round(result.scores[0] * 100),
    };
  }

  return { type: 'unknown', confidence: 0 };
}

// ─── Source Relevance Scoring ────────────────────────
// Score how relevant each source abstract is to a claim
export async function scoreSourceRelevance(
  claimText: string,
  abstractTexts: string[]
): Promise<number[]> {
  if (abstractTexts.length === 0) return [];

  const scores = await computeSimilarity(claimText, abstractTexts);
  // Normalize to 0-100
  return scores.map((s) => Math.round(Math.max(0, Math.min(1, s)) * 100));
}
