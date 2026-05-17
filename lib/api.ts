const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  price: number;
  ma20: number | null;
  ma50: number | null;
  rsi: number | null;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
}

export interface StockSummary {
  price: number;
  change: number;
  change_pct: number | null;
  period_high: number;
  period_low: number;
  avg_volume: number;
  data_points: number;
}

export interface StockData {
  symbol: string;
  summary: StockSummary;
  indicators: Indicators;
  prices: PricePoint[];
}

export interface SignalData {
  symbol: string;
  signal: "Buy" | "Sell" | "Hold";
  confidence: number;
  score: number;
  indicators: Indicators;
  reasons: string[];
}

export interface CompareItem {
  symbol: string;
  last_price?: number;
  change_pct_6mo?: number | null;
  rsi?: number | null;
  ma_trend?: string;
  ma20?: number | null;
  ma50?: number | null;
  macd?: number;
  macd_signal?: number;
  error?: string;
}

export interface CompareData {
  symbols: string[];
  comparison: CompareItem[];
}

export interface NewsArticle {
  title: string | null;
  link: string | null;
  published: string | null;
  source: string | null;
}

export interface NewsData {
  symbol: string;
  count: number;
  articles: NewsArticle[];
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  last_price?: number;
  change_pct?: number | null;
  rsi?: number | null;
  ma20?: number | null;
  ma50?: number | null;
  error?: string;
}

export interface WatchlistData {
  count: number;
  updated_at: string;
  watchlist: WatchlistItem[];
}

export const api = {
  health: () => get<{ status: string }>("/health"),
  stock: (symbol: string) => get<StockData>(`/stock/${symbol}`),
  signal: (symbol: string) => get<SignalData>(`/stock/${symbol}/signal`),
  compare: (symbol: string, symbols: string) =>
    get<CompareData>(`/stock/${symbol}/compare?symbols=${encodeURIComponent(symbols)}`),
  news: (symbol: string, limit = 10) =>
    get<NewsData>(`/news/${symbol}?limit=${limit}`),
  watchlist: (symbols: string) =>
    get<WatchlistData>(`/watchlist?symbols=${encodeURIComponent(symbols)}`),
};
