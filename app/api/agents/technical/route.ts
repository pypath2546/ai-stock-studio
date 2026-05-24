import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'NVDA';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=30d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    const rawVolumes: (number | null)[] = result?.indicators?.quote?.[0]?.volume ?? [];

    const closes = rawCloses.filter((c): c is number => typeof c === 'number');
    const volumes = rawVolumes.filter((v): v is number => typeof v === 'number');

    if (closes.length < 14) {
      return NextResponse.json({ error: 'Insufficient data' }, { status: 400 });
    }

    const changes = closes.slice(1).map((c, i) => c - closes[i]);
    const gains = changes.map((c) => Math.max(c, 0));
    const losses = changes.map((c) => Math.abs(Math.min(c, 0)));
    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(2));

    const smaWindow = Math.min(20, closes.length);
    const sma20 = parseFloat(
      (closes.slice(-smaWindow).reduce((a, b) => a + b, 0) / smaWindow).toFixed(2),
    );

    const currentPrice = closes[closes.length - 1];
    const priceVsSMA = parseFloat((((currentPrice - sma20) / sma20) * 100).toFixed(2));

    const volumeWindow = Math.min(10, volumes.length);
    const avgVolume = volumeWindow > 0
      ? volumes.slice(-volumeWindow).reduce((a, b) => a + b, 0) / volumeWindow
      : 0;
    const latestVolume = volumes[volumes.length - 1] ?? 0;
    const volumeTrend =
      avgVolume === 0
        ? 'UNKNOWN'
        : latestVolume > avgVolume * 1.2
          ? 'HIGH'
          : latestVolume < avgVolume * 0.8
            ? 'LOW'
            : 'NORMAL';

    let signal: 'BUY' | 'SELL' | 'WATCH' | 'HOLD' = 'HOLD';
    if (rsi < 30 && priceVsSMA < -5) signal = 'BUY';
    else if (rsi > 70 && priceVsSMA > 5) signal = 'SELL';
    else if (rsi < 45 && priceVsSMA < 0) signal = 'WATCH';

    return NextResponse.json({
      ticker,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      indicators: {
        rsi,
        sma20,
        priceVsSMA: `${priceVsSMA > 0 ? '+' : ''}${priceVsSMA}%`,
        volumeTrend,
      },
      signal,
      signalReason: `RSI ${rsi} · Price ${priceVsSMA >= 0 ? 'above' : 'below'} SMA20 by ${Math.abs(priceVsSMA)}% · Volume ${volumeTrend}`,
      agents: ['RENZO', 'SABLE', 'DRIX'],
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
