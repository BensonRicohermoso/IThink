'use client';

// ═══════════════════════════════════════════════════════════════
// IThink – Blank Canvas Editor
// ═══════════════════════════════════════════════════════════════

import { Claim } from '@/lib/types';
import { useRef, useCallback, useEffect } from 'react';

interface EditorProps {
  content: string;
  claims: Claim[];
  selectedClaimId: string | null;
  onContentChange: (text: string) => void;
  onSelectClaim: (id: string | null) => void;
}

export default function Editor({
  content,
  claims,
  selectedClaimId,
  onContentChange,
  onSelectClaim,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Build highlighted HTML from content + claims
  const getHighlightedHTML = useCallback(() => {
    if (!content) {
      // Avoid duplicate placeholder text: textarea already provides placeholder copy.
      return '';
    }

    if (claims.length === 0) {
      // Return content with HTML entities escaped, preserving whitespace.
      return escapeHTML(content);
    }

    // Sort claims by startIndex
    const sortedClaims = [...claims].sort((a, b) => a.startIndex - b.startIndex);
    
    let html = '';
    let lastIdx = 0;

    for (const claim of sortedClaims) {
      const start = Math.max(claim.startIndex, lastIdx);
      const end = Math.min(claim.endIndex, content.length);
      
      if (start >= end) continue;

      // Text before this claim
      if (start > lastIdx) {
        html += escapeHTML(content.slice(lastIdx, start));
      }

      // The claim itself (highlighted)
      const isSelected = claim.id === selectedClaimId;
      const claimText = escapeHTML(content.slice(start, end));
      html += `<mark class="claim-highlight ${isSelected ? 'claim-selected' : ''}" data-claim-id="${claim.id}">${claimText}</mark>`;
      
      lastIdx = end;
    }

    // Remaining text
    if (lastIdx < content.length) {
      html += escapeHTML(content.slice(lastIdx));
    }

    return html;
  }, [content, claims, selectedClaimId]);

  // Handle click on highlighted claim
  useEffect(() => {
    const el = highlightRef.current;
    if (!el) return;
    
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('claim-highlight')) {
        const claimId = target.getAttribute('data-claim-id');
        if (claimId) {
          onSelectClaim(claimId === selectedClaimId ? null : claimId);
        }
      }
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onSelectClaim, selectedClaimId]);

  return (
    <div className="editor-container flex-1 flex flex-col min-h-0">
      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Highlight overlay (behind textarea) */}
        <div
          ref={highlightRef}
          className="highlight-layer absolute inset-0 p-8 md:p-12 lg:p-16 overflow-auto whitespace-pre-wrap wrap-break-word text-base leading-8 font-sans pointer-events-none"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getHighlightedHTML() }}
        />

        {/* Textarea (transparent text, user types here) */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onScroll={handleScroll}
          placeholder="Start writing or paste your research text here...

IThink will automatically detect factual claims, find supporting sources from CrossRef and arXiv, and score credibility.

Try pasting a paragraph from a literature review, research paper, or any academic text."
          className="editor-textarea absolute inset-0 w-full h-full resize-none p-8 md:p-12 lg:p-16 text-base leading-8 font-sans bg-transparent text-transparent caret-indigo-500 outline-none placeholder:text-(--text-placeholder) selection:bg-indigo-500/30"
          spellCheck={false}
        />
      </div>

      {/* Bottom status */}
      <div className="flex items-center justify-between px-8 py-2 border-t border-(--border-subtle) bg-(--surface-soft)">
        <span className="text-[11px] text-(--text-faint)">
          {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words · ${content.length} characters` : 'Ready'}
        </span>
        <span className="text-[11px] text-(--text-faint)">
          {claims.length > 0 ? `${claims.length} claims detected` : ''}
        </span>
      </div>
    </div>
  );
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
