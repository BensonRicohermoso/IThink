'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Toolbar
// ═══════════════════════════════════════════════════════════════

interface ToolbarProps {
  isAnalyzing: boolean;
  claimCount: number;
  onAnalyze: () => void;
  onExport: () => void;
  validationMode: boolean;
  onToggleValidation: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Toolbar({
  isAnalyzing,
  claimCount,
  onAnalyze,
  onExport,
  validationMode,
  onToggleValidation,
  theme,
  onToggleTheme,
}: ToolbarProps) {
  return (
    <header className="toolbar sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-(--border-subtle) bg-(--surface) backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-sm">iT</span>
          </div>
          <div>
            <h1 className="text-base font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              IThink
            </h1>
            <p className="text-[10px] text-(--text-faint) -mt-0.5 tracking-wider">RESEARCH ASSISTANT</p>
          </div>
        </div>
      </div>

      {/* Center actions */}
      <div className="flex items-center gap-2">
        {/* Analyze button */}
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            isAnalyzing
              ? 'bg-indigo-500/20 text-indigo-400/60 cursor-wait'
              : 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analyze Claims
            </>
          )}
        </button>

        {/* Validation mode toggle */}
        <button
          onClick={onToggleValidation}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-300 border ${
            validationMode
              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
              : 'border-(--border-subtle) bg-(--surface-soft) text-(--text-muted) hover:text-(--text-secondary) hover:border-(--border-strong)'
          }`}
          title="Toggle real-time validation"
        >
          <span className={`w-2 h-2 rounded-full transition-colors ${validationMode ? 'bg-indigo-400 animate-pulse' : 'bg-(--text-faint)'}`} />
          Auto-Validate
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Claims count */}
        {claimCount > 0 && (
          <span className="text-xs text-(--text-muted) bg-(--surface-soft) px-3 py-1.5 rounded-lg border border-(--border-subtle)">
            <span className="text-indigo-400 font-semibold">{claimCount}</span> claims detected
          </span>
        )}

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-(--text-muted) border border-(--border-subtle) bg-(--surface-soft) hover:text-(--text-secondary) hover:border-(--border-strong) transition-all duration-300"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1012 21a8.963 8.963 0 008.354-5.646z" />
            </svg>
          )}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-(--text-muted) border border-(--border-subtle) bg-(--surface-soft) hover:text-(--text-secondary) hover:border-(--border-strong) transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>
    </header>
  );
}
