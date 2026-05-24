import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  addedAt: string;
}

interface Trade {
  id: number;
  action: 'BUY' | 'SELL';
  ticker: string;
  shares: number;
  price: number;
  total: number;
  reason?: string;
  date: string;
}

interface Portfolio {
  cash: number;
  holdings: Holding[];
  trades: Trade[];
  startDate: string;
  startValue: number;
}

const initial = (): Portfolio => ({
  cash: 10000,
  holdings: [],
  trades: [],
  startDate: new Date().toISOString(),
  startValue: 10000,
});

export async function GET() {
  try {
    const portfolio = (await redis.get<Portfolio>('portfolio')) || initial();
    return NextResponse.json(portfolio);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, ticker, shares, price, reason } = await request.json();

    if (action !== 'BUY' && action !== 'SELL') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      return NextResponse.json({ error: 'Invalid shares' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    const portfolio = (await redis.get<Portfolio>('portfolio')) || initial();
    const total = shares * price;

    if (action === 'BUY') {
      if (portfolio.cash < total) {
        return NextResponse.json({ error: 'Insufficient cash' }, { status: 400 });
      }
      portfolio.cash -= total;
      const existing = portfolio.holdings.find((h) => h.ticker === ticker);
      if (existing) {
        const newShares = existing.shares + shares;
        existing.avgCost = (existing.avgCost * existing.shares + total) / newShares;
        existing.shares = newShares;
      } else {
        portfolio.holdings.push({
          ticker,
          shares,
          avgCost: price,
          addedAt: new Date().toISOString(),
        });
      }
    } else {
      const holding = portfolio.holdings.find((h) => h.ticker === ticker);
      if (!holding || holding.shares < shares) {
        return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 });
      }
      portfolio.cash += total;
      holding.shares -= shares;
      if (holding.shares === 0) {
        portfolio.holdings = portfolio.holdings.filter((h) => h.ticker !== ticker);
      }
    }

    portfolio.trades.push({
      id: Date.now(),
      action,
      ticker,
      shares,
      price,
      total,
      reason,
      date: new Date().toISOString(),
    });

    await redis.set('portfolio', portfolio);
    return NextResponse.json(portfolio);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
