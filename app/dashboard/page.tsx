"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Play, RotateCcw, RefreshCw } from "lucide-react";

import {
  AGENTS, AGENTS_BY_PIPELINE, MOCK_RESULTS,
  PIPELINE_CFG, PIPELINE_FILTER_TABS, PIPELINE_ORDER,
  PipelineFilter, PipelineId, AgentStatus,
  deriveSignal,
} from "./data";
import {
  useDashboardStocks, useStockDetail, useElapsed,
} from "./hooks";
import {
  AgentCard, AnalysisResultCard, NewsPanel, OfflineBanner,
  PipelineConnector, PipelineLabel, StockInspector, WatchlistPanel,
} from "./components";

const STEP_MS = 800;
const PIPELINE_COUNT = PIPELINE_ORDER.length;
const ANALYSIS_TOTAL_MS = PIPELINE_COUNT * STEP_MS + 100;

export default function DashboardPage() {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, "idle" as AgentStatus]))
  );
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState<PipelineId | null>(null);
  const [result, setResult] = useState<{
    ticker: string;
    completedAt: number;
    isMock: boolean;
    data: typeof MOCK_RESULTS[string];
  } | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  // ─── Data hooks ────────────────────────────────────────────────────────────
  const { stocks, loading: stocksLoading, isOffline, lastUpdated, refresh } = useDashboardStocks();
  const detail = useStockDetail(selectedTicker);
  const lastUpdatedAgo = useElapsed(lastUpdated);

  // Always-fresh ref to detail — so async timers see the latest API response
  const detailRef = useRef(detail);
  useEffect(() => { detailRef.current = detail; }, [detail]);

  const selectedStock = useMemo(
    () => (selectedTicker ? stocks.find((s) => s.ticker === selectedTicker) ?? null : null),
    [selectedTicker, stocks]
  );

  // ─── Reset analysis ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsAnalyzing(false);
    setRunningPipeline(null);
    setResult(null);
    setStatuses(Object.fromEntries(AGENTS.map((a) => [a.id, "idle" as AgentStatus])));
  }, []);

  // Reset when ticker changes
  useEffect(() => { reset(); }, [selectedTicker, reset]);

  // Cleanup timeouts on unmount
  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  // ─── Run analysis ──────────────────────────────────────────────────────────
  const runAnalysis = useCallback(() => {
    if (isAnalyzing || !selectedTicker || !selectedStock) return;
    setIsAnalyzing(true);
    setResult(null);
    setStatuses(Object.fromEntries(AGENTS.map((a) => [a.id, "idle" as AgentStatus])));

    PIPELINE_ORDER.forEach((pid, i) => {
      const group = AGENTS_BY_PIPELINE[pid];

      timeoutsRef.current.push(window.setTimeout(() => {
        setRunningPipeline(pid);
        setStatuses((prev) => ({
          ...prev,
          ...Object.fromEntries(group.map((a) => [a.id, "running" as AgentStatus])),
        }));
      }, i * STEP_MS));

      timeoutsRef.current.push(window.setTimeout(() => {
        setStatuses((prev) => ({
          ...prev,
          ...Object.fromEntries(group.map((a) => [a.id, "done" as AgentStatus])),
        }));
      }, (i + 1) * STEP_MS));
    });

    // Finalize
    timeoutsRef.current.push(window.setTimeout(() => {
      setIsAnalyzing(false);
      setRunningPipeline(null);

      // Build result — prefer real backend signal, fall back to mock.
      // Read from ref so we get the latest API response, not the closure snapshot
      const liveDetail = detailRef.current;
      let data = MOCK_RESULTS[selectedTicker];
      let isMock = true;
      if (liveDetail.signal && liveDetail.signal.signal) {
        const sig = deriveSignal(liveDetail.signal.score);
        const reasons = liveDetail.signal.reasons.length > 0
          ? liveDetail.signal.reasons.slice(0, 4)
          : data?.signals ?? [];
        const newsCount = liveDetail.news.length;
        const sentimentScore = newsCount > 0
          ? Math.min(95, 40 + newsCount * 8)
          : data?.sentimentScore ?? 50;
        data = {
          signal: sig,
          confidence: liveDetail.signal.confidence,
          signals: reasons,
          sentiment: newsCount > 0 ? `Based on ${newsCount} recent articles` : "Limited news data",
          sentimentScore,
        };
        isMock = false;
      }
      if (!data) data = { signal: "HOLD", confidence: 50, signals: ["No data available"], sentiment: "Unknown", sentimentScore: 50 };

      setResult({
        ticker: selectedTicker,
        completedAt: Date.now(),
        isMock,
        data,
      });

      // Auto-scroll to result
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }, ANALYSIS_TOTAL_MS));
  }, [isAnalyzing, selectedTicker, selectedStock]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Avoid hijacking typing
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Enter" && selectedTicker && !isAnalyzing) runAnalysis();
      if (e.key === "Escape") {
        if (watchlistOpen) setWatchlistOpen(false);
        else reset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTicker, isAnalyzing, watchlistOpen, runAnalysis, reset]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const visiblePipelines: PipelineId[] =
    pipelineFilter === "all" ? PIPELINE_ORDER : [pipelineFilter];

  // Real-time price (from /stock detail) overlays the static watchlist price
  const realPrice = detail.stock?.summary.price ?? null;
  const realChange = detail.stock?.summary.change_pct ?? null;

  return (
    <div className="-mx-4 -mt-8 bg-[#1F1F00] text-white min-h-screen font-sans">

      {/* ── Dashboard Header ── */}
      <header className="sticky top-14 z-30 bg-[#1F1F00]/90 backdrop-blur-sm border-b border-[#2A2A2A]">
        <OfflineBanner visible={isOffline && !stocksLoading} onRetry={refresh} />

        <div className="px-4 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">
              <span className="italic font-serif text-amber-600 font-bold">AI Stock Studio</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2">
              {[
                `${AGENTS.length} AGENTS`,
                "1 ORCHESTRATOR",
                `${stocks.length} STOCKS`,
                `LAST UPDATE: ${lastUpdatedAgo}`,
              ].map((stat, i, arr) => (
                <span key={stat} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400 uppercase tracking-wider">{stat}</span>
                  {i < arr.length - 1 && <span className="text-gray-300">·</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setWatchlistOpen(true)}
              className="px-4 py-1.5 bg-[#111111] border border-[#ccc] rounded-full font-mono text-xs uppercase tracking-wider text-gray-400 hover:border-amber-400 hover:text-amber-700 transition-colors"
            >
              {selectedTicker ? (
                <>Watching: <span className="text-amber-600 font-bold">{selectedTicker}</span></>
              ) : "Watchlist"}
            </button>

            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || !selectedTicker}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a1a1a] text-white rounded-full font-mono text-xs uppercase tracking-wider hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-3 w-3" />
              {isAnalyzing
                ? "Analyzing"
                : selectedTicker
                ? `Analyze ${selectedTicker}`
                : "Pick Stock"}
            </button>

            <button
              onClick={refresh}
              disabled={stocksLoading}
              title="Refresh prices"
              className="p-2 border border-[#ccc] rounded-full text-gray-400 hover:text-gray-300 hover:border-gray-400 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${stocksLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={reset}
              title="Reset (Esc)"
              className="p-2 border border-[#ccc] rounded-full text-gray-400 hover:text-gray-300 hover:border-gray-400 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {PIPELINE_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPipelineFilter(tab.id)}
              className={`flex-shrink-0 px-4 py-1 rounded-full font-mono text-xs uppercase tracking-wider transition-colors duration-150 ${
                pipelineFilter === tab.id
                  ? "bg-[#1a1a1a] text-white"
                  : "border border-[#ccc] text-gray-400 hover:border-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Pipeline Rows ── */}
      <div className="px-4 sm:px-6 py-6 space-y-1">
        {visiblePipelines.map((pid, idx) => {
          const cfg = PIPELINE_CFG[pid];
          const group = AGENTS_BY_PIPELINE[pid];
          const hasRunning = group.some((a) => statuses[a.id] === "running");
          const prevDone = idx > 0 && AGENTS_BY_PIPELINE[visiblePipelines[idx - 1]].every(
            (a) => statuses[a.id] === "done"
          );

          return (
            <div key={pid}>
              {idx > 0 && pipelineFilter === "all" && (
                <PipelineConnector active={prevDone || hasRunning} />
              )}
              <div className="flex gap-4 sm:gap-6 items-start">
                <div className="hidden lg:block w-44 flex-shrink-0">
                  <PipelineLabel cfg={cfg} hasRunning={hasRunning} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 lg:hidden">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot} ${hasRunning ? "animate-pulse" : ""}`} />
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${cfg.label}`}>
                      {cfg.name}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 italic">{cfg.description}</span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {group.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} status={statuses[agent.id]} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Stock Inspector + News (only when stock selected) ── */}
        {selectedStock && (
          <div className="pt-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6 items-start">
            <div className="space-y-4 min-w-0">
              <StockInspector
                stock={selectedStock}
                realPrice={realPrice}
                realChange={realChange}
                loading={detail.loading}
              />
              {result && (
                <div ref={resultRef}>
                  <AnalysisResultCard
                    ticker={result.ticker}
                    company={selectedStock.company}
                    price={realPrice ?? selectedStock.price}
                    changePercent={realChange ?? selectedStock.changePercent}
                    result={result.data}
                    completedAt={result.completedAt}
                    isMock={result.isMock}
                    onDismiss={() => setResult(null)}
                  />
                </div>
              )}
            </div>
            <NewsPanel
              ticker={selectedTicker}
              articles={detail.news}
              loading={detail.loading}
              isOffline={isOffline && detail.news.length === 0 && !detail.loading}
            />
          </div>
        )}

        {!selectedStock && (
          <div className="pt-4 text-center py-12 text-[#999]">
            <p className="font-mono text-[10px] uppercase tracking-widest mb-2">No stock selected</p>
            <button
              onClick={() => setWatchlistOpen(true)}
              className="text-sm text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-4"
            >
              Open watchlist to pick one
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="px-4 sm:px-6 py-4 mt-2 border-t border-[#2A2A2A] flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#bbb]">
          AI Stock Studio · Powered by Claude
        </p>
        <p className="font-mono text-[9px] text-[#bbb] hidden sm:block">
          {runningPipeline
            ? `Pipeline: ${PIPELINE_CFG[runningPipeline].name.toLowerCase()}...`
            : "Click card to flip · Enter to run · Esc to reset"}
        </p>
      </footer>

      <WatchlistPanel
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        stocks={stocks}
        selectedTicker={selectedTicker}
        onSelect={setSelectedTicker}
        loading={stocksLoading}
        isOffline={isOffline}
      />
    </div>
  );
}
