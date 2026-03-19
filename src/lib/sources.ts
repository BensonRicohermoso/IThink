// ═══════════════════════════════════════════════════════════════
// IThink – Source Discovery (CrossRef + arXiv)
// ═══════════════════════════════════════════════════════════════

import { Source } from './types';

interface CrossRefAuthor {
  given?: string;
  family?: string;
}

interface CrossRefDateInfo {
  'date-parts'?: number[][];
}

interface CrossRefItem {
  title?: string[] | string;
  author?: CrossRefAuthor[];
  published?: CrossRefDateInfo;
  created?: CrossRefDateInfo;
  DOI?: string;
  URL?: string;
  abstract?: string;
  'container-title'?: string[];
}

interface CrossRefResponse {
  message?: {
    items?: CrossRefItem[];
  };
}

// ─── CrossRef API ────────────────────────────────────────────
export async function searchCrossRef(query: string, limit: number = 5): Promise<Source[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.crossref.org/works?query=${encoded}&rows=${limit}&sort=relevance&order=desc`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'IThink/1.0 (mailto:ithink@research.app)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json() as CrossRefResponse;
    const items = data.message?.items || [];

    return items.map((item, idx: number): Source => ({
      id: `crossref-${idx}-${Date.now()}`,
      title: Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled'),
      authors: (item.author || []).map((a) => `${a.given || ''} ${a.family || ''}`.trim()),
      year: item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || 'N/A',
      doi: item.DOI,
      url: item.DOI ? `https://doi.org/${item.DOI}` : (item.URL || '#'),
      abstract: item.abstract?.replace(/<[^>]*>/g, '') || undefined,
      journal: item['container-title']?.[0] || undefined,
      provider: 'crossref',
    }));
  } catch (err) {
    console.error('CrossRef search error:', err);
    return [];
  }
}

// ─── arXiv API ───────────────────────────────────────────────
export async function searchArxiv(query: string, limit: number = 5): Promise<Source[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const text = await res.text();
    
    // Parse XML manually (arXiv returns Atom XML)
    const entries = text.split('<entry>').slice(1);
    
    return entries.map((entry, idx): Source => {
      const getTag = (tag: string): string => {
        const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : '';
      };

      const getAllTags = (tag: string): string[] => {
        const matches = [...entry.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))];
        return matches.map(m => m[1].trim());
      };

      const id = getTag('id');
      const title = getTag('title').replace(/\s+/g, ' ');
      const summary = getTag('summary').replace(/\s+/g, ' ');
      const published = getTag('published');
      const authors = getAllTags('name');

      return {
        id: `arxiv-${idx}-${Date.now()}`,
        title: title || 'Untitled',
        authors,
        year: published ? new Date(published).getFullYear() : 'N/A',
        url: id || '#',
        abstract: summary || undefined,
        provider: 'arxiv',
      };
    });
  } catch (err) {
    console.error('arXiv search error:', err);
    return [];
  }
}

// ─── Combined Search ─────────────────────────────────────────
export async function searchAllSources(query: string, limit: number = 5): Promise<Source[]> {
  const [crossrefResults, arxivResults] = await Promise.all([
    searchCrossRef(query, limit),
    searchArxiv(query, limit),
  ]);

  // Interleave results for diversity
  const combined: Source[] = [];
  const maxLen = Math.max(crossrefResults.length, arxivResults.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (i < crossrefResults.length) combined.push(crossrefResults[i]);
    if (i < arxivResults.length) combined.push(arxivResults[i]);
  }

  return combined.slice(0, limit * 2);
}
