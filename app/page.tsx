"use client";

import { useEffect, useState } from "react";
import { BookOpen, Newspaper, Sparkles, TrendingUp } from "lucide-react";
import {
  PORTFOLIO_CASH_USD as CASH_USD,
  PORTFOLIO_HOLDINGS as ALL_HOLDINGS,
  TOP_HOLDINGS,
} from "@/lib/tickers";

interface PriceRow {
  last: number | null;
  change: string | null;
}

interface PaperHolding {
  ticker: string;
  shares: number;
  avgCost: number;
}

interface PaperPortfolio {
  cash: number;
  holdings: PaperHolding[];
  trades: unknown[];
  startValue: number;
}

export default function Home() {
  const [prices, setPrices]       = useState<Record<string, PriceRow>>({});
  const [priceLoading, setLoading] = useState(true);
  const [paper, setPaper] = useState<PaperPortfolio | null>(null);

  useEffect(() => {
    fetch("/api/stocks")
      .then(r => r.json())
      .then(d => { setPrices(d.prices || {}); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/portfolio")
      .then(r => r.json())
      .then((d: PaperPortfolio) => setPaper(d))
      .catch(() => {});
  }, []);

  const totalValue = ALL_HOLDINGS.reduce((sum, h) => {
    const last = prices[h.ticker]?.last;
    return sum + (last != null ? h.shares * last : h.cost);
  }, 0) + CASH_USD;

  const paperValue = paper
    ? paper.cash +
      paper.holdings.reduce((sum, h) => {
        const last = prices[h.ticker]?.last;
        return sum + (last != null ? h.shares * last : h.shares * h.avgCost);
      }, 0)
    : null;

  const paperPct = paper && paperValue != null
    ? ((paperValue - paper.startValue) / paper.startValue) * 100
    : 0;

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1200px] mx-auto">

      {/* SECTION 1: Hero */}
      <section className="mb-10">
        <p className="font-mono text-xs text-gray-400 tracking-widest uppercase mb-2">
          WELCOME BACK
        </p>
        <h1 className="text-5xl font-bold text-white mb-3">
          AI <span className="italic text-amber-600">Studio.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl">
          Your intelligent investment research workspace —
          powered by AI agents, real-time data, and structured thinking.
        </p>
      </section>

      {/* SECTION 2: Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <a href="/trading" className="bg-gold text-black rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block">
          <p className="font-mono text-xs opacity-60 tracking-widest">PORTFOLIO VALUE</p>
          {paperValue == null ? (
            <div className="h-9 w-28 bg-white/20 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold tabular-nums mt-1">
              ${Math.round(paperValue).toLocaleString("en-US")}
            </p>
          )}
          <p className="text-xs opacity-70 mt-1">
            {paper
              ? `${paperPct >= 0 ? "+" : ""}${paperPct.toFixed(2)}% paper trading`
              : "paper trading"}
          </p>
        </a>

        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="font-mono text-xs text-gray-400 tracking-widest">AI AGENTS</p>
          <p className="text-3xl font-bold mt-1">11</p>
          <p className="text-xs text-gray-400 mt-1">5 pipelines · 0 errors</p>
        </div>

        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="font-mono text-xs text-gray-400 tracking-widest">HOLDINGS</p>
          <p className="text-3xl font-bold mt-1">7</p>
          <p className="text-xs text-gray-400 mt-1">cash ${CASH_USD} · {((CASH_USD / totalValue) * 100).toFixed(1)}%</p>
        </div>

        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="font-mono text-xs text-gray-400 tracking-widest">NEWS TODAY</p>
          <p className="text-3xl font-bold mt-1">11</p>
          <p className="text-xs text-gray-400 mt-1">articles · updated 30m ago</p>
        </div>
      </section>

      {/* SECTION 3: Nav Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <a
          href="/diary"
          className="group bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 hover:border-gold/50 hover:shadow-md hover:-translate-y-1 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-black" />
            </div>
            <span className="text-xs font-mono text-gray-400 group-hover:text-gold transition-colors">
              View →
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Portfolio Diary</h2>
          <p className="text-sm text-gray-400 mb-4">
            Nick&apos;s blinded $10K portfolio — live prices, thesis tracking, and weekly snapshots.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-mono px-3 py-1 rounded-full w-fit font-medium">● Live Prices</span>
            <span className="text-xs font-mono text-gray-300 font-medium">7 Holdings</span>
          </div>
        </a>

        <a
          href="/news"
          className="group bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 hover:border-gold/50 hover:shadow-md hover:-translate-y-1 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono text-gray-400 group-hover:text-blue-600 transition-colors">
              View →
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Tech &amp; Finance News</h2>
          <p className="text-sm text-gray-400 mb-4">
            Curated RSS feeds from TechCrunch, Yahoo Finance, MarketWatch and more.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-xs font-mono px-3 py-1 rounded-full w-fit font-medium">● RSS Live</span>
            <span className="text-xs font-mono text-gray-300 font-medium">8 Sources</span>
          </div>
        </a>

        <a
          href="/ai"
          className="group bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 hover:border-gold/50 hover:shadow-md hover:-translate-y-1 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono text-gray-400 group-hover:text-amber-600 transition-colors">
              View →
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">AI Agent Studio</h2>
          <p className="text-sm text-gray-400 mb-4">
            11 AI agents across 5 pipelines — orchestrate, analyze, and report on any stock.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-gold text-black text-xs font-mono px-3 py-1 rounded-full w-fit font-medium">11 Agents</span>
            <span className="text-xs font-mono text-gray-300 font-medium">5 Pipelines</span>
          </div>
        </a>

        <a
          href="/trading"
          className="group bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 hover:border-gold/50 hover:shadow-md hover:-translate-y-1 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono text-gray-400 group-hover:text-emerald-400 transition-colors">
              View →
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Paper Trading</h2>
          <p className="text-sm text-gray-400 mb-4">
            $10K simulated portfolio with live prices and a Nick&apos;s Entry Scanner across 11 names.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-mono px-3 py-1 rounded-full w-fit font-medium">● Live Scan</span>
            <span className="text-xs font-mono text-gray-300 font-medium">$0 risk</span>
          </div>
        </a>
      </section>

      {/* SECTION 4: Portfolio Snapshot */}
      <section className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-xs text-gray-400 tracking-widest">PORTFOLIO SNAPSHOT</p>
            <h3 className="text-lg font-bold mt-1">Top Holdings</h3>
          </div>
          <a href="/diary" className="text-sm text-gold font-medium hover:underline">
            View all →
          </a>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
          {priceLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 gap-4 animate-pulse">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-16 bg-[#2A2A2A] rounded" />
                    <div className="h-3 w-24 bg-[#2A2A2A] rounded" />
                  </div>
                  <div className="w-32 h-1.5 bg-[#2A2A2A] rounded-full" />
                  <div className="space-y-1.5 text-right">
                    <div className="h-4 w-16 bg-[#2A2A2A] rounded ml-auto" />
                    <div className="h-3 w-10 bg-[#2A2A2A] rounded ml-auto" />
                  </div>
                </div>
              ))
            : TOP_HOLDINGS.map(h => {
                const p = prices[h.ticker];
                const changeNum = p?.change != null ? parseFloat(p.change) : null;
                const isPos = changeNum == null ? true : changeNum >= 0;
                return (
                  <div key={h.ticker} className="flex items-center gap-4 py-3">
                    <div className="w-36 shrink-0">
                      <p className="font-bold text-sm">{h.ticker}</p>
                      <p className="text-xs text-gray-400 truncate">{h.company}</p>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full"
                          style={{ width: `${Math.min((h.weight ?? 0) * 4, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-gray-400 tabular-nums w-10 text-right">
                        {h.weight ?? 0}%
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold tabular-nums">
                        {p?.last != null ? `$${p.last.toFixed(2)}` : "—"}
                      </p>
                      {changeNum != null && (
                        <p className={`text-xs font-mono tabular-nums ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                          {isPos ? "▲" : "▼"} {Math.abs(changeNum).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </section>
    </div>
  );
}
