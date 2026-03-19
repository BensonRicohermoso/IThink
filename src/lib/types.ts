// ═══════════════════════════════════════════════════════════════
// IThink – Core Type Definitions
// ═══════════════════════════════════════════════════════════════

export type CredibilityLevel = 'high' | 'needs-verification' | 'likely-false';

export interface Claim {
  id: string;
  text: string;
  citation?: string;
  startIndex: number;
  endIndex: number;
}

export interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number | string;
  doi?: string;
  url: string;
  abstract?: string;
  journal?: string;
  provider: 'crossref' | 'arxiv' | 'scholar';
}

export interface ValidationResult {
  claimId: string;
  score: CredibilityLevel;
  confidence: number; // 0-100
  sources: Source[];
  summary: string;
  reasoning: string;
}

export interface ExtractClaimsResponse {
  claims: Claim[];
}

export interface ValidateClaimsResponse {
  results: ValidationResult[];
}

export interface SearchSourcesResponse {
  sources: Source[];
}

export interface SummarizeResponse {
  summary: string;
}

// Editor state
export interface EditorState {
  content: string;
  claims: Claim[];
  validations: Map<string, ValidationResult>;
  selectedClaimId: string | null;
  isAnalyzing: boolean;
  sidebarTab: 'claims' | 'sources' | 'summary';
}
