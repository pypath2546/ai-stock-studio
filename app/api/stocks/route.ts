import { NextResponse } from "next/server";

export const revalidate = 300;

const TICKERS = ["GOOGL", "AVGO", "AMZN", "UBER", "CRWD", "RBRK", "SOI.PA"];

interface PriceData {
  ticker: string;
  last: number | null;
  prevClose: number | null;
  change: string | null;
  currency: string;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      TICKERS.map(async (ticker): Promise<PriceData> => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 300 },
        });
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const last: number | null = meta?.regularMarketPrice ?? null;
        const prevClose: number | null = meta?.previousClose ?? null;
        return {
          ticker,
          last,
          prevClose,
          change:
            last != null && prevClose != null && prevClose !== 0
              ? (((last - prevClose) / prevClose) * 100).toFixed(2)
              : null,
          currency: meta?.currency ?? "USD",
        };
      }),
    );

    const prices: Record<string, PriceData> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        prices[TICKERS[i]] = r.value;
      }
    });

    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
