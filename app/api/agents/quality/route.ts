import { NextResponse } from 'next/server';

interface TechnicalResponse {
  indicators?: { rsi?: number };
  signal?: string;
}

interface NewsResponse {
  articles?: unknown[];
  summary?: { avgSentiment?: number };
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

    const [techRes, newsRes, priceRes] = await Promise.all([
      fetch(`${baseUrl}/api/agents/technical?ticker=${ticker}`).then((r) => r.json() as Promise<TechnicalResponse>),
      fetch(`${baseUrl}/api/agents/news?ticker=${ticker}`).then((r) => r.json() as Promise<NewsResponse>),
      fetch(`${baseUrl}/api/stocks`).then((r) => r.json() as Promise<StocksResponse>),
    ]);

    const price = priceRes.prices?.[ticker];
    const rsi = techRes.indicators?.rsi;
    const articles = newsRes.articles ?? [];
    const avgSentiment = newsRes.summary?.avgSentiment;

    const checks = [
      {
        name: 'Price data available',
        pass: !!price?.last,
        value: price?.last != null ? `$${price.last}` : 'Missing',
      },
      {
        name: 'RSI in valid range',
        pass: typeof rsi === 'number' && rsi > 0 && rsi < 100,
        value: rsi ?? '—',
      },
      {
        name: 'News data fetched',
        pass: Array.isArray(articles),
        value: `${articles.length} articles`,
      },
      {
        name: 'Technical signal present',
        pass: !!techRes.signal,
        value: techRes.signal ?? '—',
      },
      {
        name: 'Sentiment score valid',
        pass: typeof avgSentiment === 'number',
        value: avgSentiment ?? '—',
      },
    ];

    const passed = checks.filter((c) => c.pass).length;
    const approved = passed >= 4;

    return NextResponse.json({
      ticker,
      checks,
      passed,
      total: checks.length,
      approved,
      verdict: approved
        ? 'PASS — Data quality sufficient for analysis'
        : 'FAIL — Insufficient data quality',
      agents: ['CAIN', 'NORA'],
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
