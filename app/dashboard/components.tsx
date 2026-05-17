"use client";

import { useState, useMemo } from "react";
import {
  X, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle,
  ExternalLink, Activity, RefreshCw,
} from "lucide-react";
import type { NewsArticle } from "@/lib/api";
import {
  Agent, AgentStatus, PipelineCfg, PIPELINE_CFG,
  SectorFilter, SECTOR_FILTER_TABS, Stock, fakeSparkline,
} from "./data";
import { useAnimatedNumber } from "./hooks";

// ─── OfflineBanner ────────────────────────────────────────────────────────────

export function OfflineBanner({ visible, onRetry }: { visible: boolean; onRetry: () => void }) {
  if (!visible) return null;
  return (
    <div className="px-4 sm:px-6 py-2 bg-amber-100/80 border-b border-amber-300 flex items-center gap-2.5">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
      <p className="font-mono text-[10px] uppercase tracking-widest text-amber-800 flex-1 min-w-0">
        Backend offline — showing demo data
      </p>
      <button
        onClick={onRetry}
        className="font-mono text-[10px] uppercase tracking-widest text-amber-800 hover:text-amber-900 underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  );
}

// ─── TickerNumber (smoothly tweens price changes) ─────────────────────────────

export function TickerNumber({
  value,
  prefix = "",
  decimals = 2,
  className = "",
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const animated = useAnimatedNumber(value, 700);
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {animated.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

// ─── Sparkline (pure SVG, no library) ─────────────────────────────────────────

export function Sparkline({
  values,
  color = "#10b981",
  width = 120,
  height = 36,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <div className="text-xs text-[#aaa]">—</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / (values.length - 1);

  const points = values
    .map((v, i) => `${pad + i * step},${pad + h - ((v - min) / range) * h}`)
    .join(" ");

  const areaPoints = `${pad},${pad + h} ${points} ${pad + w},${pad + h}`;
  const gradId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={pad + (values.length - 1) * step}
        cy={pad + h - ((values[values.length - 1] - min) / range) * h}
        r="2"
        fill={color}
      />
    </svg>
  );
}

// ─── SignalChip (color-coded RSI/MACD/Volume) ────────────────────────────────

interface SignalChipProps {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

export function SignalChip({ label, value, tone }: SignalChipProps) {
  const cfg = {
    good:    { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
    warn:    { dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
    bad:     { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"   },
    neutral: { dot: "bg-gray-400",   text: "text-gray-600",   bg: "bg-gray-50",   border: "border-gray-200"  },
  }[tone];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#999]">{label}</span>
      <span className={`text-xs font-semibold ${cfg.text}`}>{value}</span>
    </div>
  );
}

/** Bucket an RSI value into a SignalChip tone */
export function rsiTone(rsi: number | null | undefined): SignalChipProps["tone"] {
  if (rsi == null) return "neutral";
  if (rsi < 30 || rsi > 70) return "warn";  // oversold/overbought
  if (rsi >= 45 && rsi <= 55) return "neutral";
  return rsi > 55 ? "good" : "bad";  // momentum bias
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ status, dotClass }: { status: AgentStatus; dotClass: string }) {
  if (status === "running") {
    return (
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotClass} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
    );
  }
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  return <span className="h-2 w-2 rounded-full bg-[#D5CEC0]" />;
}

// ─── AgentCard (compact, white, with status + running animation) ─────────────

export function AgentCard({ agent, status }: { agent: Agent; status: AgentStatus }) {
  const cfg = PIPELINE_CFG[agent.pipeline];

  const statusLabel =
    status === "running"
      ? agent.id === "nexus" ? "Routing" : "Running"
      : status === "done"   ? "Complete"
                            : "Idle";
  const statusColor =
    status === "running" ? "text-amber-600"
    : status === "done"  ? "text-green-700"
                         : "text-gray-400";

  const glowShadow = status === "running"
    ? `0 0 0 1px ${cfg.glow}, 0 0 16px ${cfg.glow}, 0 1px 2px rgba(0,0,0,0.04)`
    : undefined;

  return (
    <div
      className={`relative bg-white border border-[#E8E0D0] border-l-2 ${cfg.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-[220px] sm:flex-shrink-0 overflow-hidden`}
      style={glowShadow ? { boxShadow: glowShadow } : undefined}
    >
      {/* Top row: avatar + status */}
      <div className="flex items-start justify-between gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.pravatar.cc/96?img=${agent.avatarIdx}`}
          alt={`${agent.name} portrait`}
          className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0"
          loading="lazy"
        />
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} dotClass={cfg.dot} />
          <span className={`text-[10px] font-mono uppercase tracking-widest whitespace-nowrap ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Name + role + description */}
      <p className="text-base font-bold text-[#1a1a1a] mt-3 leading-tight">{agent.name}</p>
      <p className="font-mono text-[10px] uppercase text-gray-400 mt-0.5 tracking-widest">{agent.role}</p>
      {status === "running" ? (
        <p className="text-xs text-amber-700 font-mono mt-1 leading-snug line-clamp-2 animate-pulse">
          {agent.runningLog}
        </p>
      ) : (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">{agent.description}</p>
      )}

      {/* Running progress stripe */}
      {status === "running" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className={`h-full ${cfg.dot} animate-[progress_1.4s_ease-in-out_infinite]`} />
        </div>
      )}
    </div>
  );
}

// ─── PipelineConnector (dashed vertical line between pipeline rows) ─────────

export function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div className="hidden lg:block py-1.5 pl-[88px]">
      <div
        className={`h-4 w-0 border-l border-dashed transition-colors duration-300 ${
          active ? "border-amber-500" : "border-[#D5CEC0]"
        }`}
      />
    </div>
  );
}

// ─── PipelineLabel ────────────────────────────────────────────────────────────

export function PipelineLabel({ cfg, hasRunning }: { cfg: PipelineCfg; hasRunning: boolean }) {
  return (
    <div className="pt-4 pr-2">
      <div className="flex items-center gap-2 mb-1">
        {hasRunning ? (
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
          </span>
        ) : (
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        )}
        <p className={`font-mono text-xs font-bold uppercase tracking-wider leading-tight ${cfg.label}`}>
          {cfg.name}
        </p>
      </div>
      <p className="text-xs text-gray-400 italic pl-4 leading-snug">{cfg.description}</p>
    </div>
  );
}

// ─── WatchlistPanel (with sector filter) ─────────────────────────────────────

interface WatchlistPanelProps {
  open: boolean;
  onClose: () => void;
  stocks: Stock[];
  selectedTicker: string | null;
  onSelect: (t: string) => void;
  loading: boolean;
  isOffline: boolean;
}

export function WatchlistPanel({
  open, onClose, stocks, selectedTicker, onSelect, loading, isOffline,
}: WatchlistPanelProps) {
  const [filter, setFilter] = useState<SectorFilter>("All");
  const filtered = filter === "All" ? stocks : stocks.filter((s) => s.sector === filter);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-[#E8E0D0] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8E0D0]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-[#1a1a1a] text-sm">Watchlist</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#999] mt-0.5">
                {filtered.length} of {stocks.length} symbols {isOffline && "· DEMO"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#999] hover:text-[#1a1a1a] transition-colors"
              aria-label="Close watchlist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Sector filter */}
          <div className="flex gap-1 p-0.5 bg-[#F5F0E8] rounded-lg">
            {SECTOR_FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 font-mono text-[10px] uppercase tracking-widest py-1 rounded-md transition-all duration-150 ${
                  filter === tab
                    ? "bg-white text-[#1a1a1a] shadow-sm"
                    : "text-[#888] hover:text-[#444]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && stocks.length === 0 ? (
            <div className="divide-y divide-[#EDE8DE]">
              {Array.from({ length: 6 }).map((_, i) => <WatchlistSkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-[#999] py-12">
              No {filter} symbols in watchlist.
            </p>
          ) : (
            <div className="divide-y divide-[#EDE8DE]">
              {filtered.map((s) => {
                const pos = s.changePercent >= 0;
                const sel = selectedTicker === s.ticker;
                return (
                  <button
                    key={s.ticker}
                    onClick={() => { onSelect(s.ticker); onClose(); }}
                    className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[#F5F0E8] ${
                      sel ? "bg-[#F5F0E8] border-l-2 border-l-amber-500 pl-[18px]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-[#1a1a1a]">{s.ticker}</p>
                        <span className="font-mono text-[8px] uppercase tracking-widest text-[#bbb]">
                          {s.sector}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#999] truncate max-w-[160px]">{s.company}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <TickerNumber
                        value={s.price}
                        prefix="$"
                        className="text-sm font-semibold text-[#1a1a1a]"
                      />
                      <div className={`flex items-center justify-end gap-0.5 text-[11px] font-medium ${pos ? "text-green-600" : "text-red-500"}`}>
                        {pos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {pos ? "+" : ""}{s.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WatchlistSkeletonRow() {
  return (
    <div className="px-5 py-3 flex items-center justify-between animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-12 bg-[#E8E0D0] rounded" />
        <div className="h-2.5 w-28 bg-[#F0E9DC] rounded" />
      </div>
      <div className="space-y-1.5 ml-3">
        <div className="h-3 w-14 bg-[#E8E0D0] rounded ml-auto" />
        <div className="h-2.5 w-10 bg-[#F0E9DC] rounded ml-auto" />
      </div>
    </div>
  );
}

// ─── NewsPanel ────────────────────────────────────────────────────────────────

export function NewsPanel({
  ticker, articles, loading, isOffline,
}: {
  ticker: string | null;
  articles: NewsArticle[];
  loading: boolean;
  isOffline: boolean;
}) {
  if (!ticker) return null;
  return (
    <div className="bg-white border border-[#E8E0D0] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[#E8E0D0] flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#666] font-bold">
          Latest News · {ticker}
        </p>
        {loading && (
          <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />
        )}
      </div>

      <div className="divide-y divide-[#EDE8DE] max-h-[420px] overflow-y-auto">
        {loading && articles.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <NewsSkeletonRow key={i} />)
        ) : isOffline ? (
          <p className="text-center text-xs text-[#999] py-10 px-4">
            News unavailable — backend offline
          </p>
        ) : articles.length === 0 ? (
          <p className="text-center text-xs text-[#999] py-10 px-4">No news found for {ticker}</p>
        ) : (
          articles.slice(0, 6).map((a, i) => (
            <a
              key={i}
              href={a.link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 hover:bg-[#F5F0E8] transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                  {a.source ?? "Unknown"}
                </span>
                <ExternalLink className="h-3 w-3 text-[#bbb] group-hover:text-[#666] transition-colors" />
              </div>
              <p className="text-[12px] text-[#1a1a1a] leading-snug line-clamp-2 mb-1">{a.title}</p>
              <p className="text-[10px] text-[#aaa] font-mono">{a.published ?? "—"}</p>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function NewsSkeletonRow() {
  return (
    <div className="px-4 py-3 animate-pulse space-y-1.5">
      <div className="h-2.5 w-14 bg-[#E8E0D0] rounded" />
      <div className="h-3 w-full bg-[#F0E9DC] rounded" />
      <div className="h-3 w-3/4 bg-[#F0E9DC] rounded" />
    </div>
  );
}

// ─── StockInspector (sparkline + chips + summary) ────────────────────────────

export function StockInspector({
  stock,
  realPrice,
  realChange,
  loading,
}: {
  stock: Stock;
  realPrice: number | null;
  realChange: number | null;
  loading: boolean;
}) {
  const price = realPrice ?? stock.price;
  const change = realChange ?? stock.changePercent;
  const positive = change >= 0;
  const sparklineData = useMemo(
    () => fakeSparkline(price, stock.ticker.charCodeAt(0)),
    [price, stock.ticker]
  );

  const rsi = stock.rsi ?? null;
  const ma20 = stock.ma20 ?? null;
  const ma50 = stock.ma50 ?? null;
  const maTrend: SignalChipProps["tone"] =
    ma20 != null && ma50 != null
      ? ma20 > ma50 ? "good" : "bad"
      : "neutral";
  const volumeTone: SignalChipProps["tone"] = positive ? "good" : change < -1.5 ? "bad" : "neutral";

  return (
    <div className="bg-white border border-[#E8E0D0] rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-[#1a1a1a]">{stock.ticker}</h3>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#bbb]">{stock.sector}</span>
          </div>
          <p className="text-[11px] text-[#999] truncate max-w-[220px]">{stock.company}</p>
        </div>
        <Sparkline values={sparklineData} color={positive ? "#10b981" : "#ef4444"} width={120} height={40} />
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <TickerNumber value={price} prefix="$" className="text-3xl font-bold text-[#1a1a1a]" />
        <div className={`flex items-center gap-0.5 text-sm font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
          {positive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {positive ? "+" : ""}{change.toFixed(2)}%
        </div>
        {loading && <Activity className="h-3 w-3 text-amber-500 animate-pulse ml-1" />}
      </div>

      {/* Signal chips */}
      <div className="flex flex-wrap gap-2">
        <SignalChip
          label="RSI"
          value={rsi != null ? rsi.toFixed(1) : "—"}
          tone={rsiTone(rsi)}
        />
        <SignalChip
          label="MA Trend"
          value={ma20 != null && ma50 != null ? (ma20 > ma50 ? "↑ Up" : "↓ Down") : "—"}
          tone={maTrend}
        />
        <SignalChip
          label="Volume"
          value={positive ? "Rising" : change < -1.5 ? "Heavy" : "Flat"}
          tone={volumeTone}
        />
      </div>
    </div>
  );
}

// ─── AnalysisResultCard ──────────────────────────────────────────────────────

interface AnalysisResultCardProps {
  ticker: string;
  company: string;
  price: number;
  changePercent: number;
  result: {
    signal: "BUY" | "HOLD" | "SELL";
    confidence: number;
    signals: string[];
    sentiment: string;
    sentimentScore: number;
  };
  completedAt: number;
  isMock: boolean;
  onDismiss: () => void;
}

export function AnalysisResultCard({
  ticker, company, price, changePercent, result, completedAt, isMock, onDismiss,
}: AnalysisResultCardProps) {
  const signalStyle: Record<string, string> = {
    BUY:  "bg-green-100 text-green-700 border border-green-300",
    HOLD: "bg-amber-100 text-amber-700 border border-amber-300",
    SELL: "bg-red-100  text-red-600   border border-red-300",
  };
  const sentimentBar =
    result.sentimentScore >= 70 ? "from-green-400 to-emerald-500"
    : result.sentimentScore >= 40 ? "from-amber-400 to-orange-400"
    : "from-red-400 to-rose-500";

  const completedAtStr = useMemo(
    () => new Date(completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    [completedAt]
  );

  return (
    <div className="bg-white border border-[#E8E0D0] rounded-2xl p-5 sm:p-6 shadow-sm relative">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#aaa] hover:text-[#555] transition-colors"
        aria-label="Dismiss result"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-start gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#aaa] mb-1">
            Analysis Complete — {completedAtStr} {isMock && "· DEMO"}
          </p>
          <h2 className="text-xl font-bold text-[#1a1a1a] leading-tight">
            {ticker}
            <span className="text-[#999] font-normal text-sm ml-2">{company}</span>
          </h2>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold font-mono tracking-wider ${signalStyle[result.signal]}`}>
          {result.signal}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-[#F5F0E8] rounded-xl p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#aaa] mb-1">Confidence</p>
          <p className="text-2xl font-bold text-[#1a1a1a]">{result.confidence}%</p>
          <div className="mt-2.5 h-1.5 bg-[#E0D8CC] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              style={{
                width: `${result.confidence}%`,
                transition: "width 1000ms ease-out 200ms",
              }}
            />
          </div>
        </div>

        <div className="bg-[#F5F0E8] rounded-xl p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#aaa] mb-1">News Sentiment</p>
          <p className="text-sm font-semibold text-[#1a1a1a] mb-2">{result.sentiment}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#E0D8CC] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${sentimentBar} rounded-full`}
                style={{
                  width: `${result.sentimentScore}%`,
                  transition: "width 1000ms ease-out 500ms",
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-[#999]">{result.sentimentScore}</span>
          </div>
        </div>

        <div className="bg-[#F5F0E8] rounded-xl p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#aaa] mb-1">Current Price</p>
          <TickerNumber value={price} prefix="$" className="text-2xl font-bold text-[#1a1a1a]" />
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold mt-1 ${changePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
            {changePercent >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}% today
          </div>
        </div>
      </div>

      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#aaa] mb-3">Key Signals</p>
        <ul className="space-y-2.5">
          {result.signals.map((sig, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <span className="text-[12px] text-[#555] leading-relaxed">{sig}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
