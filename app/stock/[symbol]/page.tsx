"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api, StockData, SignalData, NewsData } from "@/lib/api";

function SignalBadge({ signal }: { signal: string }) {
  const colors: Record<string, string> = {
    Buy: "bg-green-500/20 text-green-400 border-green-500/40",
    Sell: "bg-red-500/20 text-red-400 border-red-500/40",
    Hold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  };
  return (
    <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${colors[signal] ?? ""}`}>
      {signal}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
    </div>
  );
}

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockData | null>(null);
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.stock(symbol),
      api.signal(symbol),
      api.news(symbol, 8),
    ])
      .then(([s, sig, n]) => {
        setStock(s);
        setSignal(sig);
        setNews(n);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return <div className="text-center py-24 text-gray-400">Loading {symbol}…</div>;
  }
  if (error) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-red-400 text-lg">{error}</p>
        <Link href="/" className="text-blue-400 hover:underline text-sm">← Back to search</Link>
      </div>
    );
  }
  if (!stock || !signal) return null;

  const { summary, indicators, prices } = stock;
  const positive = summary.change >= 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{stock.symbol}</h1>
            <SignalBadge signal={signal.signal} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold">${summary.price.toFixed(2)}</span>
            <span className={`text-lg font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{summary.change.toFixed(2)} ({positive ? "+" : ""}{summary.change_pct?.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/compare?base=${symbol}`}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
          >
            Compare
          </Link>
        </div>
      </div>

      {/* Price chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-400 mb-4">30-Day Price</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={prices}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#60a5fa" }}
            />
            <Area type="monotone" dataKey="close" stroke="#3b82f6" fill="url(#priceGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Stat label="6mo High" value={`$${summary.period_high.toFixed(2)}`} />
          <Stat label="6mo Low" value={`$${summary.period_low.toFixed(2)}`} />
          <Stat label="Avg Volume" value={summary.avg_volume.toLocaleString()} />
          <Stat label="Data Points" value={summary.data_points} />
        </div>
      </div>

      {/* Indicators */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Technical Indicators</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Stat label="RSI (14)" value={indicators.rsi} />
          <Stat label="MA20" value={indicators.ma20 ? `$${indicators.ma20.toFixed(2)}` : null} />
          <Stat label="MA50" value={indicators.ma50 ? `$${indicators.ma50.toFixed(2)}` : null} />
          <Stat label="MACD" value={indicators.macd} />
          <Stat label="MACD Signal" value={indicators.macd_signal} />
          <Stat label="MACD Hist" value={indicators.macd_histogram} />
        </div>
      </div>

      {/* Signal detail */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold">AI Signal</h2>
          <SignalBadge signal={signal.signal} />
          <span className="text-sm text-gray-400">Confidence: {signal.confidence}%</span>
          <span className="text-sm text-gray-400">Score: {signal.score > 0 ? "+" : ""}{signal.score}</span>
        </div>
        <ul className="space-y-2">
          {signal.reasons.map((r, i) => (
            <li key={i} className="text-sm text-gray-300 flex gap-2">
              <span className="text-gray-300">•</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* News */}
      {news && news.articles.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Latest News</h2>
          <div className="space-y-3">
            {news.articles.map((a, i) => (
              <a
                key={i}
                href={a.link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <p className="text-sm font-medium text-white line-clamp-2">{a.title}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {a.source} · {a.published}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
