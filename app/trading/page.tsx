'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Plus, Minus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { TRADING_TICKERS as STOCKS } from '@/lib/tickers';

interface PriceRow {
  ticker: string;
  last: number | null;
  prevClose: number | null;
  change: string | null;
  currency: string;
}

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

interface ScanRow {
  ticker: string;
  loading: boolean;
  error?: string;
  currentPrice?: number;
  rsi?: number;
  sma20?: number;
  priceVsSMA?: number;
  entryPrice?: number;
  signal?: 'BUY' | 'SELL' | 'WATCH' | 'HOLD';
}

type EntryZone = 'GOOD' | 'NEUTRAL' | 'WAIT' | 'UNKNOWN';

function classifyEntry(rsi?: number, priceVsSMA?: number): EntryZone {
  if (rsi == null) return 'UNKNOWN';
  if (rsi > 65) return 'WAIT';
  if (rsi < 45 && priceVsSMA != null && priceVsSMA <= 2) return 'GOOD';
  if (rsi >= 45 && rsi <= 60) return 'NEUTRAL';
  return 'NEUTRAL';
}

type ModalState =
  | { kind: 'trade'; action: 'BUY' | 'SELL'; ticker: string }
  | { kind: 'reset' }
  | null;

const fmtUSD = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtCompact = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TradingPage() {
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Record<string, ScanRow>>(() =>
    Object.fromEntries(STOCKS.map((t) => [t, { ticker: t, loading: true }])),
  );
  const [scanRefreshAt, setScanRefreshAt] = useState<string | null>(null);

  const refreshScan = useCallback(async () => {
    setScan((prev) => {
      const next = { ...prev };
      for (const t of STOCKS) next[t] = { ticker: t, loading: true };
      return next;
    });
    await Promise.all(
      STOCKS.map(async (ticker) => {
        try {
          const res = await fetch(`/api/agents/technical?ticker=${ticker}`);
          const data = await res.json();
          if (!res.ok || data.error) {
            setScan((prev) => ({
              ...prev,
              [ticker]: { ticker, loading: false, error: data.error || `HTTP ${res.status}` },
            }));
            return;
          }
          const sma20 = data.indicators?.sma20 as number | undefined;
          const priceVsSMAStr = data.indicators?.priceVsSMA as string | undefined;
          const priceVsSMA = priceVsSMAStr != null ? parseFloat(priceVsSMAStr) : undefined;
          setScan((prev) => ({
            ...prev,
            [ticker]: {
              ticker,
              loading: false,
              currentPrice: data.currentPrice,
              rsi: data.indicators?.rsi,
              sma20,
              priceVsSMA,
              entryPrice: sma20 != null ? parseFloat((sma20 * 0.97).toFixed(2)) : undefined,
              signal: data.signal,
            },
          }));
        } catch (err) {
          setScan((prev) => ({
            ...prev,
            [ticker]: {
              ticker,
              loading: false,
              error: err instanceof Error ? err.message : 'Failed',
            },
          }));
        }
      }),
    );
    setScanRefreshAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    refreshScan().catch(() => {});
  }, [refreshScan]);

  const refreshAll = useCallback(async () => {
    const [pRes, fRes] = await Promise.all([
      fetch('/api/stocks').then((r) => r.json()),
      fetch('/api/portfolio').then((r) => r.json()),
    ]);
    setPrices(pRes.prices || {});
    setPortfolio(fRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll().catch(() => setLoading(false));
  }, [refreshAll]);

  const livePriceFor = useCallback(
    (ticker: string): number | null => {
      const p = prices[ticker];
      return p?.last ?? null;
    },
    [prices],
  );

  const totalValue = useMemo(() => {
    if (!portfolio) return 0;
    const holdingsValue = portfolio.holdings.reduce((sum, h) => {
      const last = livePriceFor(h.ticker);
      return sum + (last != null ? h.shares * last : h.shares * h.avgCost);
    }, 0);
    return portfolio.cash + holdingsValue;
  }, [portfolio, livePriceFor]);

  const totalReturnPct = useMemo(() => {
    if (!portfolio) return 0;
    return ((totalValue - portfolio.startValue) / portfolio.startValue) * 100;
  }, [portfolio, totalValue]);

  const placeTrade = useCallback(
    async (action: 'BUY' | 'SELL', ticker: string, shares: number, price: number, reason: string) => {
      setError(null);
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ticker, shares, price, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Trade failed');
        return false;
      }
      setPortfolio(data);
      return true;
    },
    [],
  );

  const resetPortfolio = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/portfolio/reset', { method: 'POST' });
    if (!res.ok) {
      setError('Reset failed');
      return;
    }
    await refreshAll();
    setModal(null);
  }, [refreshAll]);

  const holdingFor = (ticker: string) => portfolio?.holdings.find((h) => h.ticker === ticker);

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1200px] mx-auto">
      {/* A. Header */}
      <section className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gray-400 tracking-widest uppercase mb-2">
            PAPER TRADING
          </p>
          <h1 className="text-4xl font-bold text-white mb-2">
            Paper <span className="italic text-amber-600">Trading.</span>
          </h1>
          <p className="text-sm text-gray-400">
            Simulated portfolio · Real prices · $0 risk
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: 'reset' })}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] rounded-full text-xs font-mono uppercase tracking-wider text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </section>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* B. Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="TOTAL VALUE"
          value={loading || !portfolio ? null : fmtCompact(totalValue)}
          sub={loading || !portfolio ? '' : `started ${fmtUSD(portfolio.startValue)}`}
          primary
        />
        <StatCard
          label="TOTAL RETURN"
          value={loading || !portfolio ? null : `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`}
          sub={loading || !portfolio ? '' : (totalReturnPct >= 0 ? 'unrealized gain' : 'unrealized loss')}
          tone={totalReturnPct >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="CASH"
          value={loading || !portfolio ? null : fmtCompact(portfolio.cash)}
          sub={loading || !portfolio ? '' : `${((portfolio.cash / totalValue) * 100).toFixed(1)}% of NAV`}
        />
        <StatCard
          label="POSITIONS"
          value={loading || !portfolio ? null : String(portfolio.holdings.length)}
          sub={loading || !portfolio ? '' : `${portfolio.trades.length} trades total`}
        />
      </section>

      {/* B2. Nick's Entry Scanner */}
      <EntryScanner scan={scan} refreshAt={scanRefreshAt} onRefresh={refreshScan} />

      {/* C. Quick Trade Panel */}
      <section className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-xs text-gray-400 tracking-widest">QUICK TRADE</p>
            <h3 className="text-lg font-bold mt-1">Watchlist</h3>
          </div>
          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
            Live prices · Yahoo Finance
          </span>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
          {STOCKS.map((ticker) => {
            const p = prices[ticker];
            const changeNum = p?.change != null ? parseFloat(p.change) : null;
            const isPos = changeNum == null ? true : changeNum >= 0;
            const holding = holdingFor(ticker);
            const hasPrice = p?.last != null;

            return (
              <div key={ticker} className="flex items-center gap-4 py-3">
                <div className="w-24 shrink-0">
                  <p className="font-bold text-sm">{ticker}</p>
                  {holding && (
                    <p className="text-[10px] font-mono text-gold">
                      {holding.shares} sh
                    </p>
                  )}
                </div>

                <div className="flex-1 text-right">
                  <p className="font-mono text-sm font-bold tabular-nums">
                    {hasPrice ? fmtUSD(p!.last!) : '—'}
                  </p>
                  {changeNum != null && (
                    <p className={`text-xs font-mono tabular-nums ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPos ? '▲' : '▼'} {Math.abs(changeNum).toFixed(2)}%
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModal({ kind: 'trade', action: 'BUY', ticker })}
                    disabled={!hasPrice}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold text-black text-xs font-mono uppercase tracking-wider hover:bg-[#F0B800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Buy
                  </button>
                  {holding && (
                    <button
                      type="button"
                      onClick={() => setModal({ kind: 'trade', action: 'SELL', ticker })}
                      disabled={!hasPrice}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111111] border border-gold text-gold text-xs font-mono uppercase tracking-wider hover:bg-[#1F1F00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                      Sell
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* E. Holdings Table */}
      <section className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-xs text-gray-400 tracking-widest">CURRENT HOLDINGS</p>
            <h3 className="text-lg font-bold mt-1">
              {portfolio?.holdings.length ?? 0} positions
            </h3>
          </div>
        </div>

        {!portfolio || portfolio.holdings.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No holdings yet. Use Quick Trade above to buy your first position.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['TICKER', 'SHARES', 'AVG COST', 'LIVE PRICE', 'VALUE', 'P/L', 'P/L%', ''].map((h) => (
                    <th
                      key={h}
                      className="py-2 px-2 text-left font-mono text-[10px] text-gray-400 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {portfolio.holdings.map((h) => {
                  const live = livePriceFor(h.ticker);
                  const value = (live ?? h.avgCost) * h.shares;
                  const pl = live != null ? (live - h.avgCost) * h.shares : 0;
                  const plPct = live != null ? ((live - h.avgCost) / h.avgCost) * 100 : 0;
                  const isPos = pl >= 0;
                  return (
                    <tr key={h.ticker}>
                      <td className="py-3 px-2 font-bold">{h.ticker}</td>
                      <td className="py-3 px-2 font-mono tabular-nums">{h.shares}</td>
                      <td className="py-3 px-2 font-mono tabular-nums">{fmtUSD(h.avgCost)}</td>
                      <td className="py-3 px-2 font-mono tabular-nums">
                        {live != null ? fmtUSD(live) : '—'}
                      </td>
                      <td className="py-3 px-2 font-mono tabular-nums">{fmtUSD(value)}</td>
                      <td className={`py-3 px-2 font-mono tabular-nums ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {live == null ? '—' : `${isPos ? '+' : ''}${fmtUSD(pl)}`}
                      </td>
                      <td className={`py-3 px-2 font-mono tabular-nums ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {live == null ? '—' : `${isPos ? '+' : ''}${plPct.toFixed(2)}%`}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (live == null) return;
                            placeTrade('SELL', h.ticker, h.shares, live, 'Sell all').catch(() => {});
                          }}
                          disabled={live == null}
                          className="px-3 py-1 rounded-full border border-gold text-gold text-[10px] font-mono uppercase tracking-wider hover:bg-[#1F1F00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Sell All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* F. Trade History */}
      <section className="bg-[#111111] border border-[#2A2A2A] rounded-2xl">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <p className="font-mono text-xs text-gray-400 tracking-widest">HISTORY</p>
            <h3 className="text-lg font-bold mt-1">
              View trade history ({portfolio?.trades.length ?? 0})
            </h3>
          </div>
          {historyOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {historyOpen && (
          <div className="px-6 pb-6">
            {!portfolio || portfolio.trades.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No trades yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      {['DATE', 'ACTION', 'TICKER', 'SHARES', 'PRICE', 'TOTAL', 'REASON'].map((h) => (
                        <th
                          key={h}
                          className="py-2 px-2 text-left font-mono text-[10px] text-gray-400 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {[...portfolio.trades].reverse().map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 px-2 font-mono text-xs text-gray-400 tabular-nums">
                          {fmtDate(t.date)}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                              t.action === 'BUY'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {t.action}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold">{t.ticker}</td>
                        <td className="py-2 px-2 font-mono tabular-nums">{t.shares}</td>
                        <td className="py-2 px-2 font-mono tabular-nums">{fmtUSD(t.price)}</td>
                        <td className="py-2 px-2 font-mono tabular-nums">{fmtUSD(t.total)}</td>
                        <td className="py-2 px-2 text-xs text-gray-400 truncate max-w-[200px]">
                          {t.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* D. Trade Modal */}
      {modal?.kind === 'trade' && portfolio && (
        <TradeModal
          action={modal.action}
          ticker={modal.ticker}
          price={livePriceFor(modal.ticker) ?? 0}
          cashAvailable={portfolio.cash}
          sharesAvailable={holdingFor(modal.ticker)?.shares ?? 0}
          onClose={() => setModal(null)}
          onConfirm={async (shares, reason) => {
            const price = livePriceFor(modal.ticker);
            if (price == null) return;
            const ok = await placeTrade(modal.action, modal.ticker, shares, price, reason);
            if (ok) setModal(null);
          }}
        />
      )}

      {/* G. Reset confirmation */}
      {modal?.kind === 'reset' && (
        <ConfirmModal
          title="Reset portfolio?"
          body="This resets your cash to $10,000 and clears all holdings and trade history. This cannot be undone."
          confirmLabel="Yes, reset"
          tone="danger"
          onCancel={() => setModal(null)}
          onConfirm={resetPortfolio}
        />
      )}
    </div>
  );
}

function EntryScanner({
  scan,
  refreshAt,
  onRefresh,
}: {
  scan: Record<string, ScanRow>;
  refreshAt: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const rows = STOCKS.map((t) => scan[t]).filter(Boolean) as ScanRow[];

  return (
    <section className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-xs text-gray-400 tracking-widest">NICK&apos;S ENTRY SCANNER</p>
          <h3 className="text-lg font-bold text-white mt-1">Where to put new money</h3>
          <p className="text-xs text-gray-400 mt-1">
            Entry zone = SMA20 × 0.97 (3% below trend) · RSI &lt; 45 + near SMA20 = good entry
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshAt && (
            <span className="hidden sm:inline font-mono text-[10px] text-gray-500 uppercase tracking-widest">
              {new Date(refreshAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] rounded-full text-xs font-mono uppercase tracking-wider text-gray-300 hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Scanning' : 'Rescan'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {['TICKER', 'PRICE', 'RSI', 'VS SMA20', 'ENTRY ZONE', 'SIGNAL'].map((h, i) => (
                <th
                  key={h}
                  className={`py-2 px-2 font-mono text-[10px] text-gray-400 uppercase tracking-widest ${
                    i === 0 ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {rows.map((r) => (
              <ScannerRow key={r.ticker} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScannerRow({ row }: { row: ScanRow }) {
  if (row.loading) {
    return (
      <tr>
        <td className="py-3 px-2 font-bold text-white">{row.ticker}</td>
        <td colSpan={5} className="py-3 px-2 text-right">
          <span className="font-mono text-xs text-gray-400 animate-pulse">scanning…</span>
        </td>
      </tr>
    );
  }

  if (row.error || row.rsi == null) {
    return (
      <tr>
        <td className="py-3 px-2 font-bold text-white">{row.ticker}</td>
        <td colSpan={5} className="py-3 px-2 text-right font-mono text-xs text-gray-400">
          {row.error || 'no data'}
        </td>
      </tr>
    );
  }

  const zone = classifyEntry(row.rsi, row.priceVsSMA);
  const zoneStyles: Record<EntryZone, { bg: string; text: string; label: string }> = {
    GOOD: { bg: 'bg-emerald-500/15 border border-emerald-500/40', text: 'text-emerald-400', label: 'Good entry' },
    NEUTRAL: { bg: 'bg-amber-500/15 border border-amber-500/40', text: 'text-amber-400', label: 'Neutral' },
    WAIT: { bg: 'bg-red-500/15 border border-red-500/40', text: 'text-red-400', label: 'Wait' },
    UNKNOWN: { bg: 'bg-[#1A1A1A] border border-[#2A2A2A]', text: 'text-gray-400', label: '—' },
  };
  const zoneCfg = zoneStyles[zone];

  const rsiColor =
    row.rsi < 45 ? 'text-emerald-400' : row.rsi > 65 ? 'text-red-400' : 'text-amber-400';

  const vsSmaColor =
    row.priceVsSMA == null
      ? 'text-gray-400'
      : row.priceVsSMA < 0
        ? 'text-emerald-400'
        : row.priceVsSMA > 5
          ? 'text-red-400'
          : 'text-gray-200';

  const signalColors: Record<NonNullable<ScanRow['signal']>, string> = {
    BUY: 'bg-emerald-500/20 text-emerald-300',
    SELL: 'bg-red-500/20 text-red-300',
    WATCH: 'bg-amber-500/20 text-amber-300',
    HOLD: 'bg-[#1F1F00] text-gray-300',
  };

  return (
    <tr className="hover:bg-[#1A1A00]/40 transition-colors">
      <td className="py-3 px-2">
        <div className="font-bold text-white">{row.ticker}</div>
      </td>
      <td className="py-3 px-2 text-right font-mono tabular-nums text-gray-200">
        {row.currentPrice != null ? `$${row.currentPrice.toFixed(2)}` : '—'}
      </td>
      <td className={`py-3 px-2 text-right font-mono tabular-nums font-semibold ${rsiColor}`}>
        {row.rsi.toFixed(1)}
      </td>
      <td className={`py-3 px-2 text-right font-mono tabular-nums ${vsSmaColor}`}>
        {row.priceVsSMA == null
          ? '—'
          : `${row.priceVsSMA > 0 ? '+' : ''}${row.priceVsSMA.toFixed(2)}%`}
      </td>
      <td className="py-3 px-2 text-right">
        <div className={`inline-flex flex-col items-end gap-0.5 px-2.5 py-1 rounded-lg ${zoneCfg.bg}`}>
          <span className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${zoneCfg.text}`}>
            {zoneCfg.label}
          </span>
          {row.entryPrice != null && (
            <span className="font-mono text-[11px] tabular-nums text-gray-200">
              @ ${row.entryPrice.toFixed(2)}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        {row.signal && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${signalColors[row.signal]}`}
          >
            {row.signal}
          </span>
        )}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  sub,
  primary,
  tone,
}: {
  label: string;
  value: string | null;
  sub: string;
  primary?: boolean;
  tone?: 'positive' | 'negative';
}) {
  const valueColor =
    tone === 'positive' ? 'text-gold' : tone === 'negative' ? 'text-red-500' : 'text-gold';

  if (primary || tone) {
    return (
      <div className="bg-[#111111] border border-gold/30 rounded-2xl p-5">
        <p className="font-mono text-xs text-gray-400 tracking-widest">{label}</p>
        {value == null ? (
          <div className="h-9 w-28 bg-[#2A2A2A] rounded animate-pulse mt-1" />
        ) : (
          <p className={`text-3xl font-bold tabular-nums mt-1 ${valueColor}`}>{value}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{sub || ' '}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
      <p className="font-mono text-xs text-gray-400 tracking-widest">{label}</p>
      {value == null ? (
        <div className="h-9 w-24 bg-[#2A2A2A] rounded animate-pulse mt-1" />
      ) : (
        <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">{sub || ' '}</p>
    </div>
  );
}

function TradeModal({
  action,
  ticker,
  price,
  cashAvailable,
  sharesAvailable,
  onClose,
  onConfirm,
}: {
  action: 'BUY' | 'SELL';
  ticker: string;
  price: number;
  cashAvailable: number;
  sharesAvailable: number;
  onClose: () => void;
  onConfirm: (shares: number, reason: string) => Promise<void>;
}) {
  const [sharesInput, setSharesInput] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const shares = Math.max(0, Math.floor(Number(sharesInput) || 0));
  const total = shares * price;
  const isBuy = action === 'BUY';
  const exceedsCash = isBuy && total > cashAvailable;
  const exceedsShares = !isBuy && shares > sharesAvailable;
  const invalid = shares < 1 || exceedsCash || exceedsShares;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111111] rounded-2xl w-full max-w-md p-6 shadow-xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-mono text-xs text-gray-400 tracking-widest">
              {isBuy ? 'BUY ORDER' : 'SELL ORDER'}
            </p>
            <h3 id="trade-modal-title" className="text-2xl font-bold mt-1">
              <span className={isBuy ? 'text-emerald-600' : 'text-red-600'}>
                {action}
              </span>{' '}
              {ticker}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Live price</span>
            <span className="font-mono font-bold tabular-nums">{fmtUSD(price)}</span>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">
              Shares
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={sharesInput}
              onChange={(e) => setSharesInput(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-[#2A2A2A] rounded-lg font-mono tabular-nums focus:outline-none focus:border-gold"
            />
          </div>

          <div className="flex items-center justify-between text-sm bg-[#1F1F00] rounded-lg px-3 py-2">
            <span className="text-gray-400">Total {isBuy ? 'cost' : 'proceeds'}</span>
            <span className="font-mono font-bold tabular-nums">{fmtUSD(total)}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            {isBuy ? (
              <>
                <span>Available cash</span>
                <span className={`font-mono tabular-nums ${exceedsCash ? 'text-red-500 font-bold' : ''}`}>
                  {fmtUSD(cashAvailable)}
                </span>
              </>
            ) : (
              <>
                <span>Available shares</span>
                <span className={`font-mono tabular-nums ${exceedsShares ? 'text-red-500 font-bold' : ''}`}>
                  {sharesAvailable}
                </span>
              </>
            )}
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Thesis, catalyst, signal..."
              className="w-full px-3 py-2 border border-[#2A2A2A] rounded-lg text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#2A2A2A] rounded-full text-sm font-medium text-gray-300 hover:bg-[#1F1F00] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={invalid || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onConfirm(shares, reason);
                } finally {
                  setSubmitting(false);
                }
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isBuy ? 'bg-gold hover:bg-[#F0B800]' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting ? 'Submitting…' : `Confirm ${action}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'danger';
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-body"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111111] rounded-2xl w-full max-w-md p-6 shadow-xl"
      >
        <h3 id="confirm-modal-title" className="text-xl font-bold mb-2">{title}</h3>
        <p id="confirm-modal-body" className="text-sm text-gray-400 mb-6">{body}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-[#2A2A2A] rounded-full text-sm font-medium text-gray-300 hover:bg-[#1F1F00] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm();
              } finally {
                setSubmitting(false);
              }
            }}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-40 ${
              tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-gold hover:bg-[#F0B800]'
            }`}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

