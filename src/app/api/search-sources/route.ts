// ═══════════════════════════════════════════════════════════════
// IThink – Search Sources API Route
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { searchAllSources } from '@/lib/sources';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ sources: [] });
    }

    const sources = await searchAllSources(query, 5);
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Search sources error:', error);
    return NextResponse.json(
      { error: 'Failed to search sources', sources: [] },
      { status: 500 }
    );
  }
}
