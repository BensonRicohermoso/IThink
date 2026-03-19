'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Citation Explorer
// ═══════════════════════════════════════════════════════════════

import { Source, ValidationResult } from '@/lib/types';
import { useState } from 'react';

interface CitationExplorerProps {
  validation: ValidationResult | null;
  onClose: () => void;
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="source-card group rounded-xl border border-(--border-subtle) bg-(--surface-soft) p-4 transition-all duration-300 hover:border-(--border-strong) hover:bg-(--surface-soft-hover)">
      <div className="flex items-start gap-3">
        {/* Source number */}
        <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-(--text-primary) leading-snug hover:text-indigo-400 transition-colors line-clamp-2"
          >
            {source.title}
          </a>

          {/* Authors + Year */}
          <p className="mt-1 text-xs text-(--text-muted) truncate">
            {source.authors.slice(0, 3).join(', ')}
            {source.authors.length > 3 ? ' et al.' : ''} · {source.year}
          </p>

          {/* Journal */}
          {source.journal && (
            <p className="mt-0.5 text-xs text-(--text-faint) italic truncate">{source.journal}</p>
          )}

          {/* Provider badge */}
          <span className={`mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            source.provider === 'crossref'
              ? 'bg-blue-500/15 text-blue-400'
              : source.provider === 'arxiv'
              ? 'bg-orange-500/15 text-orange-400'
              : 'bg-purple-500/15 text-purple-400'
          }`}>
            {source.provider}
          </span>

          {/* DOI */}
          {source.doi && (
            <p className="mt-1 text-[11px] text-(--text-faint) font-mono truncate">
              DOI: {source.doi}
            </p>
          )}

          {/* Abstract toggle */}
          {source.abstract && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-indigo-400/80 hover:text-indigo-400 transition-colors"
              >
                {expanded ? '▼ Hide abstract' : '▶ Show abstract'}
              </button>
              {expanded && (
                <p className="mt-2 text-xs text-(--text-muted) leading-relaxed border-l-2 border-indigo-500/30 pl-3 animate-fadeIn">
                  {source.abstract}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CitationExplorer({ validation, onClose }: CitationExplorerProps) {
  if (!validation) return null;

  return (
    <div className="animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-(--text-secondary) flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400 text-xs">🔍</span>
          Citation Explorer
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-(--text-faint) hover:text-(--text-muted) hover:bg-(--surface-soft-hover) transition-all"
        >
          ✕
        </button>
      </div>

      {/* Reasoning */}
      <div className="mb-4 p-3 rounded-lg bg-(--surface-soft) border border-(--border-subtle)">
        <p className="text-xs text-(--text-muted) mb-1 font-medium uppercase tracking-wider">AI Assessment</p>
        <p className="text-sm text-(--text-secondary) leading-relaxed">{validation.reasoning}</p>
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 rounded-lg bg-linear-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
        <p className="text-xs text-(--text-muted) mb-1 font-medium uppercase tracking-wider">Summary</p>
        <p className="text-sm text-(--text-secondary) leading-relaxed">{validation.summary}</p>
      </div>

      {/* Sources */}
      <div>
        <p className="text-xs text-(--text-muted) mb-3 font-medium uppercase tracking-wider">
          Found Sources ({validation.sources.length})
        </p>
        {validation.sources.length > 0 ? (
          <div className="space-y-2">
            {validation.sources.map((source, idx) => (
              <SourceCard key={source.id} source={source} index={idx} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-(--text-faint) italic text-center py-4">
            No academic sources found for this claim.
          </p>
        )}
      </div>
    </div>
  );
}
