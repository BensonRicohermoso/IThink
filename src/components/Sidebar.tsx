'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Floating Sidebar
// ═══════════════════════════════════════════════════════════════

import { Claim, ValidationResult } from '@/lib/types';
import CredibilityBadge from './CredibilityBadge';
import CitationExplorer from './CitationExplorer';
import { useState } from 'react';

interface SidebarProps {
  claims: Claim[];
  validations: Record<string, ValidationResult>;
  selectedClaimId: string | null;
  onSelectClaim: (id: string | null) => void;
  isAnalyzing: boolean;
  summaryText: string;
  isSummarizing: boolean;
}

type Tab = 'claims' | 'sources' | 'summary';

export default function Sidebar({
  claims,
  validations,
  selectedClaimId,
  onSelectClaim,
  isAnalyzing,
  summaryText,
  isSummarizing,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('claims');
  const [collapsed, setCollapsed] = useState(false);

  const selectedValidation = selectedClaimId ? validations[selectedClaimId] : null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'claims', label: 'Claims', icon: '📋' },
    { id: 'sources', label: 'Sources', icon: '📚' },
    { id: 'summary', label: 'Summary', icon: '💡' },
  ];

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-4 top-20 z-40 w-12 h-12 rounded-2xl bg-(--surface) backdrop-blur-xl border border-(--border-subtle) shadow-2xl flex items-center justify-center text-(--text-muted) hover:text-(--text-primary) hover:border-indigo-500/40 transition-all duration-300"
        title="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    );
  }

  return (
    <aside className="sidebar w-95 shrink-0 h-full flex flex-col bg-(--surface) backdrop-blur-2xl border-l border-(--border-subtle) overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-linear-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-xs">🧠</span>
          </div>
          <span className="text-sm font-semibold text-(--text-secondary)">AI Research Panel</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-(--text-faint) hover:text-(--text-muted) hover:bg-(--surface-soft-hover) transition-all"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-2 pt-2 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-(--surface-soft-hover) text-(--text-primary) border border-(--border-strong) shadow-lg'
                : 'text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--surface-soft)'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'claims' && claims.length > 0 && (
              <span className="ml-1 text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">
                {claims.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Loading state */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-(--text-muted) animate-pulse">Analyzing your text...</p>
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && !isAnalyzing && (
          <div className="space-y-2">
            {claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--surface-soft) flex items-center justify-center">
                  <span className="text-3xl opacity-30">📝</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-(--text-muted)">No claims detected yet</p>
                  <p className="text-xs text-(--text-faint) mt-1">
                    Type or paste research text, then click <strong>Analyze Claims</strong>
                  </p>
                </div>
              </div>
            ) : (
              claims.map((claim) => {
                const validation = validations[claim.id];
                const isSelected = selectedClaimId === claim.id;
                return (
                  <button
                    key={claim.id}
                    onClick={() => onSelectClaim(isSelected ? null : claim.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
                      isSelected
                        ? 'border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-(--border-subtle) bg-(--surface-soft) hover:border-(--border-strong) hover:bg-(--surface-soft-hover)'
                    }`}
                  >
                    <p className="text-sm text-(--text-secondary) leading-relaxed line-clamp-3">
                      &ldquo;{claim.text}&rdquo;
                    </p>
                    {claim.citation && (
                      <p className="mt-1 text-xs text-indigo-400/60 font-mono">{claim.citation}</p>
                    )}
                    {validation && (
                      <div className="mt-2">
                        <CredibilityBadge
                          score={validation.score}
                          confidence={validation.confidence}
                          size="sm"
                        />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && !isAnalyzing && (
          <div>
            {selectedClaimId && selectedValidation ? (
              <CitationExplorer
                validation={selectedValidation}
                onClose={() => onSelectClaim(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--surface-soft) flex items-center justify-center">
                  <span className="text-3xl opacity-30">🔍</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-(--text-muted)">Select a claim to explore sources</p>
                  <p className="text-xs text-(--text-faint) mt-1">
                    Click on a claim in the Claims tab to see related sources
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && !isAnalyzing && (
          <div>
            {isSummarizing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-sm text-(--text-muted) animate-pulse">Generating summary...</p>
              </div>
            ) : summaryText ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-linear-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">💡</span>
                    <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">AI Insight Summary</span>
                  </div>
                  <div className="text-sm text-(--text-secondary) leading-relaxed whitespace-pre-wrap">
                    {summaryText}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-(--surface-soft) flex items-center justify-center">
                  <span className="text-3xl opacity-30">💡</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-(--text-muted)">No summary available</p>
                  <p className="text-xs text-(--text-faint) mt-1">
                    Analyze claims to generate an AI insight summary
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t border-(--border-subtle) bg-(--surface-soft)">
        <div className="flex items-center justify-between text-[10px] text-(--text-faint)">
          <span>Powered by Gemini AI</span>
          <span>CrossRef · arXiv</span>
        </div>
      </div>
    </aside>
  );
}
