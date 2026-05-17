"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, CompareItem } from "@/lib/api";

function Cell({ value, positive }: { value: string | number | null | undefined; positive?: boolean }) {
  if (value == null) return <td className="py-3 px-4 text-gray-500 text-right">—</td>;
  const color = positive === true ? "text-green-400" : positive === false ? "text-red-400" : "text-gray-200";
  return <td className={`py-3 px-4 text-right ${color}`}>{value}</td>;
}

function RsiCell({ rsi }: { rsi?: number | null }) {
  if (rsi == null) return <td className="py-3 px-4 text-gray-500 text-right">—</td>;
  const color = rsi < 30 ? "text-green-400" : rsi > 70 ? "text-red-400" : "text-gray-200";
  return <td className={`py-3 px-4 text-right ${color}`}>{rsi}</td>;
}

function TrendCell({ trend }: { trend?: string }) {
  if (!trend || trend === "N/A") return <td className="py-3 px-4 text-gray-500 text-right">—</td>;
  const color = trend === "Uptrend" ? "text-green-400" : "text-red-400";
  return <td className={`py-3 px-4 text-right ${color}`}>{trend}</td>;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [base, setBase] = useState(searchParams.get("base") ?? "AAPL");
  const [others, setOthers] = useState("MSFT,GOOGL");
  const [rows, setRows] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const b = base.trim().toUpperCase();
    const o = others.trim().toUpperCase();
    if (!b || !o) return;
    setLoading(true);
    setError(null);
    api.compare(b, o)
      .then((d) => setRows(d.comparison))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [base, others]);

  useEffect(() => {
    if (base) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Compare Stocks</h1>
        <p className="text-sm text-gray-400">Compare up to 10 symbols side by side</p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Base symbol</label>
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-32"
          />
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-xs text-gray-500">Compare with (comma-separated)</label>
          <input
            value={others}
            onChange={(e) => setOthers(e.target.value)}
            placeholder="MSFT,GOOGL,TSLA"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm"
        >
          {loading ? "Loading…" : "Compare"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="pb-3 px-4 text-left">Symbol</th>
                <th className="pb-3 px-4 text-right">Price</th>
                <th className="pb-3 px-4 text-right">6mo Return</th>
                <th className="pb-3 px-4 text-right">RSI</th>
                <th className="pb-3 px-4 text-right">MA Trend</th>
                <th className="pb-3 px-4 text-right">MA20</th>
                <th className="pb-3 px-4 text-right">MA50</th>
                <th className="pb-3 px-4 text-right">MACD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {rows.map((row) => (
                <tr key={row.symbol} className="hover:bg-gray-900/50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {row.error ? (
                      <span className="text-gray-500">{row.symbol}</span>
                    ) : (
                      <Link href={`/stock/${row.symbol}`} className="text-blue-400 hover:underline">
                        {row.symbol}
                      </Link>
                    )}
                    {row.error && (
                      <span className="block text-xs text-red-400">{row.error}</span>
                    )}
                  </td>
                  <Cell value={row.last_price != null ? `$${row.last_price.toFixed(2)}` : null} />
                  <Cell
                    value={row.change_pct_6mo != null ? `${row.change_pct_6mo >= 0 ? "+" : ""}${row.change_pct_6mo.toFixed(2)}%` : null}
                    positive={row.change_pct_6mo != null ? row.change_pct_6mo >= 0 : undefined}
                  />
                  <RsiCell rsi={row.rsi} />
                  <TrendCell trend={row.ma_trend} />
                  <Cell value={row.ma20 != null ? `$${row.ma20.toFixed(2)}` : null} />
                  <Cell value={row.ma50 != null ? `$${row.ma50.toFixed(2)}` : null} />
                  <Cell value={row.macd != null ? row.macd.toFixed(4) : null} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
