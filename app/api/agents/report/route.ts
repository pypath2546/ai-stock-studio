import { NextResponse } from 'next/server';

interface TechnicalResponse {
  indicators?: { rsi?: number };
  signal?: string;
  signalReason?: string;
}

interface NewsResponse {
  articles?: unknown[];
  summary?: { overall?: string; avgSentiment?: number };
}

interface QualityResponse {
  approved?: boolean;
  passed?: number;
  total?: number;
}

interface PriceRow {
  last: number | null;
}

interface StocksResponse {
  prices?: Record<string, PriceRow>;
}

function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'NVDA';
    const baseUrl = getBaseUrl(request);

    const [tech, news, quality, priceData] = await Promise.all([
      fetch(`${baseUrl}/api/agents/technical?ticker=${ticker}`).then((r) => r.json() as Promise<TechnicalResponse>),
      fetch(`${baseUrl}/api/agents/news?ticker=${ticker}`).then((r) => r.json() as Promise<NewsResponse>),
      fetch(`${baseUrl}/api/agents/quality?ticker=${ticker}`).then((r) => r.json() as Promise<QualityResponse>),
      fetch(`${baseUrl}/api/stocks`).then((r) => r.json() as Promise<StocksResponse>),
    ]);

    const price = priceData.prices?.[ticker];

    const signals = {
      technical: tech.signal,
      sentiment: news.summary?.overall,
      quality: quality.approved ? 'PASS' : 'FAIL',
    };

    let recommendation: 'BUY' | 'SELL' | 'WATCH' | 'HOLD' = 'HOLD';
    let confidence = 50;

    if (signals.technical === 'BUY' && signals.sentiment === 'POSITIVE') {
      recommendation = 'BUY';
      confidence = 82;
    } else if (signals.technical === 'SELL' && signals.sentiment === 'NEGATIVE') {
      recommendation = 'SELL';
      confidence = 78;
    } else if (signals.technical === 'BUY') {
      recommendation = 'WATCH';
      confidence = 65;
    } else if (signals.technical === 'HOLD') {
      recommendation = 'HOLD';
      confidence = 70;
    }

    return NextResponse.json({
      ticker,
      currentPrice: price?.last,
      recommendation,
      confidence,
      signals,
      technical: {
        rsi: tech.indicators?.rsi,
        signal: tech.signal,
        reason: tech.signalReason,
      },
      news: {
        articles: news.articles?.length ?? 0,
        sentiment: news.summary?.overall,
        score: news.summary?.avgSentiment,
      },
      quality: {
        approved: !!quality.approved,
        passed: `${quality.passed ?? 0}/${quality.total ?? 0}`,
      },
      generatedAt: new Date().toISOString(),
      agents: ['ATLAS', 'FINN'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
