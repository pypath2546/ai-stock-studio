import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
import { NextResponse } from 'next/server';

interface KBEntry {
  id: string;
  type: string;
  url: string | null;
  title: string;
  summary: string;
  tickers: string[];
  addedAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const ticker = searchParams.get('ticker') || '';

  const kb: KBEntry[] = await kv.get('knowledge_base') || [];

  const results = kb.filter(entry => {
    if (ticker && entry.tickers?.includes(ticker)) return true;
    if (query) {
      const q = query.toLowerCase();
      if (entry.title?.toLowerCase().includes(q)) return true;
      if (entry.summary?.toLowerCase().includes(q)) return true;
    }
    return false;
  }).slice(0, 5);

  return NextResponse.json({ results });
}
