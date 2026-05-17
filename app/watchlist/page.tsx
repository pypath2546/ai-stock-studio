"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { api, WatchlistItem } from "@/lib/api";

const DEFAULT_SYMBOLS = "AAPL,MSFT,GOOGL,TSLA,NVDA";

function RsiBadge({ rsi }: { rsi: number | null | undefined }) {
  if (rsi == null) return <span className="text-gray-500">—</span>;
  const color = rsi < 30 ? "text-green-400" : rsi > 70 ? "text-red-400" : "text-gray-300";
  return <span className={color}>{rsi}</span>;
}

function ChangeCell({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-gray-500">—</span>;
  const color = pct >= 0 ? "text-green-400" : "text-red-400";
  return <span className={color}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>;
}

export default function WatchlistPage() {
  const [input, setInput] = useState(DEFAULT_SYMBOLS);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const syms = input.trim();
    if (!syms) return;
    setLoading(true);
    setError(null);
    api.watchlist(syms)
      .then((d) => {
        setItems(d.watchlist);
        setUpdatedAt(d.updated_at);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [input]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Watchlist</h1>
        <p className="text-sm text-gray-400">Enter comma-separated symbols to track</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AAPL,MSFT,PTT.BK"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          onClick={load}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {updatedAt && (
        <p className="text-xs text-gray-500">Updated {new Date(updatedAt).toLocaleTimeString()}</p>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="pb-3 pr-4">Symbol</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4 text-right">Price</th>
                <th className="pb-3 pr-4 text-right">Change</th>
                <th className="pb-3 pr-4 text-right">RSI</th>
                <th className="pb-3 pr-4 text-right">MA20</th>
                <th className="pb-3 text-right">MA50</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {items.map((item) => (
                <tr key={item.symbol} className="hover:bg-gray-900/50 transition-colors">
                  <td className="py-3 pr-4 font-medium">
                    {item.error ? (
                      <span className="text-gray-500">{item.symbol}</span>
                    ) : (
                      <Link href={`/stock/${item.symbol}`} className="text-blue-400 hover:underline">
                        {item.symbol}
                      </Link>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-400 max-w-[180px] truncate">
                    {item.error ? <span className="text-red-400 text-xs">{item.error}</span> : item.name ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {item.last_price != null ? `$${item.last_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <ChangeCell pct={item.change_pct} />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <RsiBadge rsi={item.rsi} />
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-300">
                    {item.ma20 != null ? `$${item.ma20.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 text-right text-gray-300">
                    {item.ma50 != null ? `$${item.ma50.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
