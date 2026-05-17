"use client";

import { useEffect, useRef, useState } from "react";
import { api, NewsArticle, SignalData, StockData } from "@/lib/api";
import { MOCK_STOCKS, SECTOR_OF, Stock, TICKERS } from "./data";

// ─── useElapsed ───────────────────────────────────────────────────────────────

/** Returns "Xs ago" / "Xm ago" / "Xh ago" relative to `since`, ticking every second */
export function useElapsed(since: number | null): string {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (since == null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);

  if (since == null) return "—";
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

// ─── useDashboardStocks ───────────────────────────────────────────────────────

interface DashboardStocksState {
  stocks: Stock[];
  loading: boolean;
  isOffline: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

/**
 * Fetches the 10 dashboard tickers from the FastAPI /watchlist endpoint.
 * Falls back to MOCK_STOCKS and sets isOffline=true if the backend is unreachable
 * or returns errors for all tickers.
 */
export function useDashboardStocks(): DashboardStocksState {
  const [stocks, setStocks] = useState<Stock[]>(MOCK_STOCKS);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .watchlist(TICKERS.join(","))
      .then((data) => {
        if (cancelled) return;
        const mockByTicker = new Map(MOCK_STOCKS.map((s) => [s.ticker, s]));
        const merged: Stock[] = data.watchlist.map((item) => {
          const fallback = mockByTicker.get(item.symbol);
          if (item.error || item.last_price == null) {
            return fallback ?? {
              ticker: item.symbol,
              company: item.symbol,
              price: 0,
              change: 0,
              changePercent: 0,
              sector: SECTOR_OF[item.symbol] ?? "Tech",
            };
          }
          return {
            ticker: item.symbol,
            company: item.name ?? fallback?.company ?? item.symbol,
            price: item.last_price,
            change: 0,  // backend doesn't return absolute change, only pct
            changePercent: item.change_pct ?? 0,
            sector: SECTOR_OF[item.symbol] ?? "Tech",
            rsi: item.rsi,
            ma20: item.ma20,
            ma50: item.ma50,
          };
        });

        const allErrored = data.watchlist.every((w) => w.error || w.last_price == null);
        setStocks(merged);
        setIsOffline(allErrored);
        setLastUpdated(Date.now());
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStocks(MOCK_STOCKS);
        setIsOffline(true);
        setLastUpdated(Date.now());
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    stocks,
    loading,
    isOffline,
    lastUpdated,
    refresh: () => setTick((t) => t + 1),
  };
}

// ─── useStockDetail ───────────────────────────────────────────────────────────

interface StockDetailState {
  stock: StockData | null;
  signal: SignalData | null;
  news: NewsArticle[];
  loading: boolean;
  error: string | null;
}

/** Fetches /stock, /signal, /news in parallel when ticker changes. */
export function useStockDetail(ticker: string | null): StockDetailState {
  const [state, setState] = useState<StockDetailState>({
    stock: null,
    signal: null,
    news: [],
    loading: false,
    error: null,
  });
  const lastTicker = useRef<string | null>(null);

  useEffect(() => {
    if (!ticker) {
      setState({ stock: null, signal: null, news: [], loading: false, error: null });
      lastTicker.current = null;
      return;
    }
    lastTicker.current = ticker;
    setState({ stock: null, signal: null, news: [], loading: true, error: null });

    Promise.allSettled([
      api.stock(ticker),
      api.signal(ticker),
      api.news(ticker, 6),
    ]).then(([s, sg, n]) => {
      if (lastTicker.current !== ticker) return;  // stale response, ignore
      setState({
        stock: s.status === "fulfilled" ? s.value : null,
        signal: sg.status === "fulfilled" ? sg.value : null,
        news: n.status === "fulfilled" ? n.value.articles : [],
        loading: false,
        error: s.status === "rejected" && sg.status === "rejected" && n.status === "rejected"
          ? (s.reason as Error).message ?? "Failed to load"
          : null,
      });
    });
  }, [ticker]);

  return state;
}

// ─── useAnimatedNumber ────────────────────────────────────────────────────────

/** Smoothly tweens to `target` over `duration` ms. */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = val;
    startRef.current = null;
    let raf = 0;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);  // ease-out cubic
      setVal(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return val;
}
