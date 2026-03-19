'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Main Page (App Orchestration)
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { Claim, ValidationResult } from '@/lib/types';
import Toolbar from '@/components/Toolbar';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';

type ThemeMode = 'dark' | 'light';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  const saved = window.localStorage.getItem('ithink-theme');
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

export default function Home() {
  // ─── State ──────────────────────────────────────────
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [content, setContent] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({});
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationMode, setValidationMode] = useState(true);
  const [summaryText, setSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Theme Sync ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('ithink-theme', theme);
  }, [theme]);

  // ─── Analyze Claims ─────────────────────────────────
  const analyzeClaims = useCallback(async (text?: string) => {
    const textToAnalyze = text || content;
    if (!textToAnalyze || textToAnalyze.trim().length < 10) return;

    setIsAnalyzing(true);
    setSummaryText('');

    try {
      // Step 1: Extract claims
      const extractRes = await fetch('/api/extract-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      const { claims: extractedClaims } = await extractRes.json();
      setClaims(extractedClaims || []);

      if (!extractedClaims || extractedClaims.length === 0) {
        setIsAnalyzing(false);
        return;
      }

      // Step 2: Validate claims (source discovery + credibility scoring)
      const validateRes = await fetch('/api/validate-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: extractedClaims }),
      });

      const { results } = await validateRes.json();

      const validationMap: Record<string, ValidationResult> = {};
      (results || []).forEach((r: ValidationResult) => {
        validationMap[r.claimId] = r;
      });
      setValidations(validationMap);

      // Step 3: Summarize overall insights
      setIsSummarizing(true);
      const allSources = (results || []).flatMap((r: ValidationResult) => r.sources || []);
      const claimTexts = extractedClaims.map((c: Claim) => c.text).join('; ');

      const summaryRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimTexts, sources: allSources.slice(0, 10) }),
      });

      const { summary } = await summaryRes.json();
      setSummaryText(summary || '');
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
      setIsSummarizing(false);
    }
  }, [content]);

  // ─── Content Change Handler ─────────────────────────
  const handleContentChange = useCallback((text: string) => {
    setContent(text);

    // Auto-validate mode: debounced analysis
    if (validationMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        analyzeClaims(text);
      }, 3000); // 3 second debounce for auto mode
    }
  }, [validationMode, analyzeClaims]);

  // ─── Export ─────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!content) return;

    let exportText = content + '\n\n';

    if (claims.length > 0) {
      exportText += '═══════════════════════════════════════\n';
      exportText += 'IThink Analysis Report\n';
      exportText += '═══════════════════════════════════════\n\n';

      claims.forEach((claim, idx) => {
        const validation = validations[claim.id];
        exportText += `Claim ${idx + 1}: "${claim.text}"\n`;
        if (validation) {
          const icon = validation.score === 'high' ? '✅' : validation.score === 'needs-verification' ? '⚠️' : '❌';
          exportText += `  Credibility: ${icon} ${validation.score} (${validation.confidence}%)\n`;
          exportText += `  Summary: ${validation.summary}\n`;
          if (validation.sources.length > 0) {
            exportText += '  Sources:\n';
            validation.sources.forEach((s, si) => {
              exportText += `    [${si + 1}] ${s.title} (${s.year}) - ${s.url}\n`;
            });
          }
        }
        exportText += '\n';
      });

      if (summaryText) {
        exportText += '─── Overall Summary ───\n';
        exportText += summaryText + '\n';
      }
    }

    navigator.clipboard.writeText(exportText).then(() => {
      alert('Report copied to clipboard!');
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ithink-report.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [content, claims, validations, summaryText]);

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="bg-ambient" />

      {/* Toolbar */}
      <Toolbar
        isAnalyzing={isAnalyzing}
        claimCount={claims.length}
        onAnalyze={() => analyzeClaims()}
        onExport={handleExport}
        validationMode={validationMode}
        onToggleValidation={() => setValidationMode(!validationMode)}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      {/* Main content: Editor + Sidebar */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Editor canvas */}
        <Editor
          content={content}
          claims={claims}
          selectedClaimId={selectedClaimId}
          onContentChange={handleContentChange}
          onSelectClaim={setSelectedClaimId}
        />

        {/* Floating Sidebar */}
        <Sidebar
          claims={claims}
          validations={validations}
          selectedClaimId={selectedClaimId}
          onSelectClaim={setSelectedClaimId}
          isAnalyzing={isAnalyzing}
          summaryText={summaryText}
          isSummarizing={isSummarizing}
        />
      </div>
    </div>
  );
}
