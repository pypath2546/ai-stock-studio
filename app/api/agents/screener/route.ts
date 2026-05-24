import { NextResponse } from 'next/server';

const UNIVERSE = Array.from(new Set([
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','AVGO','BRK-B','JPM',
  'LLY','V','UNH','XOM','MA','JNJ','PG','HD','COST','ABBV',
  'WMT','MRK','CVX','NFLX','CRM','AMD','TMO','BAC','ACN','MCD',
  'ABT','CSCO','ADBE','WFC','TXN','DHR','NOW','QCOM','IBM','GE',
  'AMGN','NEE','INTU','PFE','ISRG','SPGI','BKNG','GS','RTX',
  'CRWD','PLTR','RBRK','UBER','SNOW','NET','DDOG','ARM','SMCI',
]));

interface TechnicalResponse {
  ticker: string;
  currentPrice?: number;
  indicators?: {
    rsi?: number;
    sma20?: number;
    priceVsSMA?: string;
    volumeTrend?: 'HIGH' | 'LOW' | 'NORMAL' | 'UNKNOWN';
  };
  signal?: 'BUY' | 'SELL' | 'WATCH' | 'HOLD';
  error?: string;
}

interface Pick {
  ticker: string;
  score: number;
  price: number | undefined;
  rsi: number;
  signal: TechnicalResponse['signal'];
  vsSMA: string | undefined;
  volume: string;
  entryZone: string;
  reason: string;
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;

  const results = await Promise.allSettled(
    UNIVERSE.map(async (ticker): Promise<Pick | null> => {
      try {
        const res = await fetch(`${baseUrl}/api/agents/technical?ticker=${encodeURIComponent(ticker)}`);
        const data: TechnicalResponse = await res.json();
        if (!res.ok || data.error) return null;

        const rsi = data.indicators?.rsi ?? 50;
        const signal = data.signal ?? 'HOLD';
        const volume = data.indicators?.volumeTrend ?? 'NORMAL';
        const vsSMAStr = data.indicators?.priceVsSMA ?? '0';
        const vsSMA = parseFloat(vsSMAStr);

        let score = 0;

        if (rsi >= 30 && rsi <= 45) score += 30;
        else if (rsi > 45 && rsi <= 55) score += 20;
        else if (rsi < 30) score += 15;

        if (vsSMA >= -3 && vsSMA < 0) score += 30;
        else if (vsSMA < -3) score += 20;
        else if (vsSMA >= 0 && vsSMA <= 2) score += 10;

        if (volume === 'HIGH') score += 20;
        else if (volume === 'NORMAL') score += 5;

        if (signal === 'BUY') score += 30;
        else if (signal === 'WATCH') score += 15;
        else if (signal === 'HOLD') score += 5;

        const price = data.currentPrice;
        const entryZone = price != null ? (price * 0.97).toFixed(2) : '—';

        return {
          ticker,
          score,
          price,
          rsi,
          signal,
          vsSMA: data.indicators?.priceVsSMA,
          volume,
          entryZone,
          reason: `RSI ${rsi} · ${data.indicators?.priceVsSMA ?? '—'} vs SMA20 · Volume ${volume}`,
        };
      } catch {
        return null;
      }
    }),
  );

  const scored = results
    .filter((r): r is PromiseFulfilledResult<Pick> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({
    topPicks: scored,
    scannedAt: new Date().toISOString(),
    universe: UNIVERSE.length,
  });
}
