import { NextResponse } from 'next/server';

interface Article {
  title?: string;
  description?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
}

function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

const POSITIVE = ['surge', 'beat', 'growth', 'record', 'strong', 'bullish', 'gain', 'up', 'rise'];
const NEGATIVE = ['drop', 'miss', 'decline', 'weak', 'bearish', 'loss', 'down', 'fall', 'crash'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'NVDA';

    const newsRes = await fetch(`${getBaseUrl(request)}/api/news`);
    const newsJson: { articles?: Article[] } = await newsRes.json();
    const articles = newsJson.articles ?? [];

    const relevant = articles
      .filter((a) => a.title?.includes(ticker) || a.description?.includes(ticker))
      .slice(0, 5);

    const scored = relevant.map((a) => {
      const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase();
      const positive = POSITIVE.filter((w) => text.includes(w)).length;
      const negative = NEGATIVE.filter((w) => text.includes(w)).length;
      const score = (positive - negative) / (positive + negative + 1);
      return {
        title: a.title,
        source: a.source,
        url: a.url,
        publishedAt: a.publishedAt,
        sentiment: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
        score: parseFloat(score.toFixed(2)),
      };
    });

    const avgScore = scored.length
      ? scored.reduce((s, a) => s + a.score, 0) / scored.length
      : 0;

    return NextResponse.json({
      ticker,
      articles: scored,
      summary: {
        total: scored.length,
        avgSentiment: parseFloat(avgScore.toFixed(2)),
        overall: avgScore > 0.1 ? 'POSITIVE' : avgScore < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
      },
      agents: ['NICO', 'VERA', 'ZOLA'],
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
