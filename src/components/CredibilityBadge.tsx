'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Credibility Badge
// ═══════════════════════════════════════════════════════════════

import { CredibilityLevel } from '@/lib/types';

interface CredibilityBadgeProps {
  score: CredibilityLevel;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
}

const config: Record<CredibilityLevel, { icon: string; label: string; color: string; bg: string; glow: string }> = {
  'high': {
    icon: '✅',
    label: 'Verified',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  'needs-verification': {
    icon: '⚠️',
    label: 'Needs Verification',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    glow: 'shadow-amber-500/20',
  },
  'likely-false': {
    icon: '❌',
    label: 'Likely False',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    glow: 'shadow-red-500/20',
  },
};

export default function CredibilityBadge({ score, confidence, size = 'md' }: CredibilityBadgeProps) {
  const c = config[score];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium transition-all duration-300 ${c.bg} ${c.color} ${sizeClasses[size]} shadow-md ${c.glow}`}
      title={`${c.label}${confidence !== undefined ? ` (${confidence}% confidence)` : ''}`}
    >
      <span className="flex-shrink-0">{c.icon}</span>
      <span>{c.label}</span>
      {confidence !== undefined && (
        <span className="opacity-60 text-xs">({confidence}%)</span>
      )}
    </span>
  );
}
