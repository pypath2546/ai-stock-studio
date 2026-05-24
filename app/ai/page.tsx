"use client";

import { useEffect, useState } from "react";
import { Play, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNewsOutline } from "@/lib/news-outline-context";
import { TRADING_TICKERS as TICKERS, PORTFOLIO_HOLDINGS } from "@/lib/tickers";
import { useAnalysisStore, type AgentStatus, type AnalysisResult } from "@/lib/analysisStore";

interface Agent {
  name: string;
  role: string;
  pipeline: string;
  description: string;
  avatarUrl: string;
  order: number;
}

interface PipelineColors {
  dot: string;
  border: string;
  leftColor: string;
  bg: string;
  glow: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}


function generateCommentary(result: AnalysisResult): string {
  const { ticker, recommendation, confidence, technical, news, currentPrice } = result;

  const rsi = technical?.rsi;
  const sentiment = news?.sentiment;
  const articles = news?.articles ?? 0;
  const score = news?.score ?? 0;
  const priceStr = currentPrice != null ? `$${currentPrice.toFixed(2)}` : "—";

  const rsiComment =
    rsi == null
      ? `ยังไม่พบค่า RSI สำหรับ ${ticker}`
      : rsi < 30
      ? `RSI ที่ ${rsi} บ่งชี้ว่า ${ticker} อยู่ในโซน oversold — ราคาอาจถูก undervalue`
      : rsi > 70
      ? `RSI ที่ ${rsi} บ่งชี้ว่า ${ticker} อยู่ในโซน overbought — ระวังการ correction`
      : rsi < 45
      ? `RSI ที่ ${rsi} อยู่ในโซน neutral-bearish — momentum ยังไม่แข็งแกร่ง`
      : `RSI ที่ ${rsi} อยู่ในโซน neutral-bullish — momentum สมดุลดี`;

  const smaComment = technical?.reason?.includes("above")
    ? `ราคาปัจจุบัน ${priceStr} อยู่เหนือ SMA20 — trend ระยะสั้นเป็นบวก`
    : `ราคาปัจจุบัน ${priceStr} อยู่ต่ำกว่า SMA20 — trend ระยะสั้นอ่อนแอ`;

  const newsComment =
    articles === 0
      ? `ไม่พบข่าวที่เกี่ยวข้องกับ ${ticker} ในช่วงนี้ — อาจเป็นช่วง quiet period`
      : sentiment === "POSITIVE"
      ? `ข่าว ${articles} บทความมี sentiment เป็นบวก (score: ${score}) — market perception ดี`
      : sentiment === "NEGATIVE"
      ? `ข่าว ${articles} บทความมี sentiment เป็นลบ (score: ${score}) — มีแรงกดดันจากข่าว`
      : `ข่าว ${articles} บทความมี sentiment เป็นกลาง — ตลาดยังไม่มีทิศทางชัดเจน`;

  const recComment =
    recommendation === "BUY"
      ? `สัญญาณ Technical และ News ชี้ไปในทิศทางเดียวกัน — ${ticker} น่าสนใจสำหรับการเข้าซื้อ`
      : recommendation === "SELL"
      ? `ทั้ง Technical และ News ส่งสัญญาณลบพร้อมกัน — ควรพิจารณาลดความเสี่ยง`
      : recommendation === "WATCH"
      ? `สัญญาณยังไม่ชัดเจนพอ — ควร monitor ${ticker} ต่อไปก่อนตัดสินใจ`
      : `ไม่มีสัญญาณที่แข็งแกร่งพอในทิศทางใด — Nick แนะนำให้ถือและรอสัญญาณที่ชัดขึ้น`;

  const confComment =
    confidence >= 80
      ? `ความมั่นใจสูง (${confidence}%) — สัญญาณหลายตัวชี้ทิศทางเดียวกัน`
      : confidence >= 65
      ? `ความมั่นใจปานกลาง (${confidence}%) — มีสัญญาณสนับสนุนแต่ยังไม่แข็งแกร่ง`
      : `ความมั่นใจต่ำ (${confidence}%) — สัญญาณขัดแย้งกัน ควรระวัง`;

  return `${rsiComment}. ${smaComment}. ${newsComment}. ${recComment}. ${confComment}.`;
}

const pipelineColors: Record<string, PipelineColors> = {
  Orchestrator:   { dot: "bg-amber-400",  border: "border-gold", leftColor: "#fbbf24", bg: "bg-[#2A1A00]", glow: "shadow-[0_0_24px_-4px_var(--color-gold)]" },
  Technical:      { dot: "bg-blue-400",   border: "border-gold", leftColor: "#60a5fa", bg: "bg-[#001A2A]", glow: "shadow-[0_0_24px_-4px_var(--color-gold)]" },
  News:           { dot: "bg-green-400",  border: "border-gold", leftColor: "#4ade80", bg: "bg-[#001A0A]", glow: "shadow-[0_0_24px_-4px_var(--color-gold)]" },
  "Quality Gate": { dot: "bg-red-400",    border: "border-gold", leftColor: "#f87171", bg: "bg-[#1A0000]", glow: "shadow-[0_0_24px_-4px_var(--color-gold)]" },
  Report:         { dot: "bg-purple-400", border: "border-gold", leftColor: "#c084fc", bg: "bg-[#1A002A]", glow: "shadow-[0_0_24px_-4px_var(--color-gold)]" },
};

const AGENTS: Agent[] = [
  { name: "KIRA",  role: "ORCHESTRATOR",    pipeline: "Orchestrator",   description: "Never analyzes directly — always delegates to the right agent.",    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=kira-orchestrator&backgroundColor=ffd89b",  order: 0 },
  { name: "RENZO", role: "INDICATORS",      pipeline: "Technical",      description: "Transforms raw price into meaningful signals.",                       avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=renzo-indicators&backgroundColor=bfdbfe",  order: 1 },
  { name: "SABLE", role: "SIGNAL DETECTION",pipeline: "Technical",      description: "Finds patterns humans miss in the noise.",                            avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=sable-signal&backgroundColor=bfdbfe",     order: 2 },
  { name: "DRIX",  role: "DECISION ENGINE", pipeline: "Technical",      description: "Conviction over activity — if in doubt, hold.",                       avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=drix-decision&backgroundColor=bfdbfe",    order: 3 },
  { name: "NICO",  role: "FETCHER",         pipeline: "News",           description: "First to the story, last to the rumor.",                              avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=nico-fetcher&backgroundColor=bbf7d0",     order: 4 },
  { name: "VERA",  role: "SENTIMENT",       pipeline: "News",           description: "Every headline has a hidden bias score.",                             avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=vera-sentiment&backgroundColor=bbf7d0",   order: 5 },
  { name: "ZOLA",  role: "SUMMARIZER",      pipeline: "News",           description: "Noise becomes signal. Signal becomes edge.",                          avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=zola-summarizer&backgroundColor=bbf7d0",  order: 6 },
  { name: "CAIN",  role: "QUALITY GATE",    pipeline: "Quality Gate",   description: "A thesis needs evidence, not just confidence.",                       avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=cain-judge&backgroundColor=fecaca",       order: 7 },
  { name: "NORA",  role: "FACT GATE",       pipeline: "Quality Gate",   description: "Unverified data doesn't pass. Ever.",                                 avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=nora-factgate&backgroundColor=fecaca",    order: 8 },
  { name: "ATLAS", role: "ANALYST",         pipeline: "Report",         description: "The report writes itself — after the work is done.",                  avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=atlas-analyst&backgroundColor=e9d5ff",    order: 9 },
  { name: "FINN",  role: "PUBLISHER",       pipeline: "Report",         description: "Formatted. Timestamped. Ready to act on.",                            avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=finn-publisher&backgroundColor=e9d5ff",   order: 10 },
];

const PIPELINE_GROUPS = [
  { id: "Orchestrator",   label: "ORCHESTRATOR",      description: "routes every task",          sectionId: "ai-orchestrator" },
  { id: "Technical",      label: "TECHNICAL PIPELINE", description: "price → indicator → signal", sectionId: "ai-technical" },
  { id: "News",           label: "NEWS PIPELINE",      description: "fetch → sentiment → summary",sectionId: "ai-news" },
  { id: "Quality Gate",   label: "QUALITY GATE",       description: "nothing ships unchecked",    sectionId: "ai-quality" },
  { id: "Report",         label: "REPORT",             description: "run on demand",              sectionId: "ai-report" },
];

const PIPELINES = ["All", "Orchestrator", "Technical", "News", "Quality Gate", "Report"];

const AI_OUTLINE = [
  { href: "#ai-orchestrator", label: "Orchestrator" },
  { href: "#ai-technical",    label: "Technical Pipeline" },
  { href: "#ai-news",         label: "News Pipeline" },
  { href: "#ai-quality",      label: "Quality Gate" },
  { href: "#ai-report",       label: "Report" },
];

const WATCHLIST_STOCKS = PORTFOLIO_HOLDINGS;

export default function AIPage() {
  const analysisResult = useAnalysisStore((s) => s.result);
  const agentStatuses = useAnalysisStore((s) => s.agentStatuses);
  const selectedTicker = useAnalysisStore((s) => s.selectedTicker);
  const setResult = useAnalysisStore((s) => s.setResult);
  const setAgentStatuses = useAnalysisStore((s) => s.setAgentStatuses);
  const setSelectedTicker = useAnalysisStore((s) => s.setSelectedTicker);
  const clearResult = useAnalysisStore((s) => s.clearResult);

  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [isScreening, setIsScreening]     = useState(false);
  const [activePipeline, setActivePipeline] = useState("All");
  const [showWatchlist, setShowWatchlist]   = useState(false);
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { last: number | null; change: string | null }>>({});
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { setItems } = useNewsOutline();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setItems(AI_OUTLINE);
    return () => setItems(null);
  }, [setItems]);

  useEffect(() => {
    fetch("/api/stocks")
      .then(r => r.json())
      .then(data => setWatchlistPrices(data.prices || {}))
      .catch(() => {});
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAgentStatuses({});
    setResult(() => null);

    // Stage 1: KIRA orchestrates
    setAgentStatuses({ KIRA: 'running' });
    await new Promise(r => setTimeout(r, 800));
    setAgentStatuses({ KIRA: 'done' });

    // Stage 2: Technical pipeline
    setAgentStatuses(prev => ({ ...prev, RENZO: 'running', SABLE: 'running', DRIX: 'running' }));
    const techPromise = fetch(`/api/agents/technical?ticker=${selectedTicker}`).then(r => r.json());
    await new Promise(r => setTimeout(r, 1000));
    await techPromise;
    setAgentStatuses(prev => ({ ...prev, RENZO: 'done', SABLE: 'done', DRIX: 'done' }));

    // Stage 3: News pipeline
    setAgentStatuses(prev => ({ ...prev, NICO: 'running', VERA: 'running', ZOLA: 'running' }));
    const newsPromise = fetch(`/api/agents/news?ticker=${selectedTicker}`).then(r => r.json());
    await new Promise(r => setTimeout(r, 1000));
    await newsPromise;
    setAgentStatuses(prev => ({ ...prev, NICO: 'done', VERA: 'done', ZOLA: 'done' }));

    // Stage 4: Quality gate
    setAgentStatuses(prev => ({ ...prev, CAIN: 'running', NORA: 'running' }));
    const qualityPromise = fetch(`/api/agents/quality?ticker=${selectedTicker}`).then(r => r.json());
    await new Promise(r => setTimeout(r, 800));
    await qualityPromise;
    setAgentStatuses(prev => ({ ...prev, CAIN: 'done', NORA: 'done' }));

    // Stage 5: Report
    setAgentStatuses(prev => ({ ...prev, ATLAS: 'running', FINN: 'running' }));
    const reportRes = await fetch(`/api/agents/report?ticker=${selectedTicker}`).then(r => r.json());
    await new Promise(r => setTimeout(r, 800));
    setAgentStatuses(prev => ({ ...prev, ATLAS: 'done', FINN: 'done' }));

    const reportResult: AnalysisResult = {
      ticker: selectedTicker,
      recommendation: reportRes.recommendation,
      confidence: reportRes.confidence,
      currentPrice: reportRes.currentPrice,
      signals: reportRes.signals ?? {},
      technical: reportRes.technical ?? {},
      news: reportRes.news ?? {},
      quality: reportRes.quality ?? {},
    };
    setResult(reportResult);

    // Stage 6: Nick screens market
    setIsScreening(true);
    setAgentStatuses(prev => ({ ...prev, KIRA: 'running' }));
    try {
      const screenRes = await fetch('/api/agents/screener').then(r => r.json());
      setResult(prev =>
        prev
          ? { ...prev, topPicks: screenRes.topPicks, universeScanned: screenRes.universe }
          : prev,
      );
    } catch {
      /* screener is supplementary — fail silently */
    }
    setAgentStatuses(prev => ({ ...prev, KIRA: 'done' }));
    setIsScreening(false);

    setIsAnalyzing(false);
  };

  const handleReset = () => {
    clearResult();
  };

  const visibleGroups = PIPELINE_GROUPS.filter(
    g => activePipeline === "All" || activePipeline === g.id,
  );

  const totalDone    = Object.values(agentStatuses).filter(s => s === "done").length;
  const totalRunning = Object.values(agentStatuses).filter(s => s === "running").length;
  const errCount     = 0;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-mono text-gray-400 tracking-widest uppercase mb-1">
              AI STOCK STUDIO
            </p>
            <h1 className="text-4xl font-bold text-white">
              AI <span className="italic text-amber-600">Studio.</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2 font-mono">
              {AGENTS.length} AGENTS · {PIPELINE_GROUPS.length} PIPELINES · 1 ORCHESTRATOR · {errCount} ERRORS
              {totalDone > 0 && ` · ${totalDone} DONE`}
              {totalRunning > 0 && ` · ${totalRunning} RUNNING`}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {analysisResult && (
              <button
                onClick={handleReset}
                className="px-4 py-3 border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#1A1A1A] transition-all text-sm font-mono"
              >
                Reset ↺
              </button>
            )}
            <button
              onClick={() => setShowWatchlist(!showWatchlist)}
              className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] bg-[#111111] rounded-xl hover:bg-[#1F1F00] transition-all font-medium text-gray-300"
            >
              <TrendingUp className="w-4 h-4" />
              Watchlist
            </button>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-gold text-black rounded-xl hover:bg-[#F0B800] disabled:opacity-50 transition-all font-medium"
            >
              <Play className="w-4 h-4" />
              {isAnalyzing ? "Running…" : "Run Analysis"}
            </button>
          </div>
        </div>
      </header>

      {/* Pipeline filter tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {PIPELINES.map(p => {
          const colors = pipelineColors[p];
          return (
            <button
              key={p}
              onClick={() => setActivePipeline(p)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activePipeline === p
                  ? "bg-gold text-black"
                  : "border border-[#2A2A2A] text-gray-300 hover:bg-[#1A1A1A]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  colors ? colors.dot : "bg-gray-400"
                }`}
              />
              {p}
            </button>
          );
        })}
      </div>

      {/* Ticker selector */}
      <div className="flex gap-2 flex-wrap mb-6 items-center">
        <p className="text-sm font-mono text-gray-400 mr-2">Analyze:</p>
        {TICKERS.map(t => (
          <button
            key={t}
            onClick={() => setSelectedTicker(t)}
            disabled={isAnalyzing}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedTicker === t
                ? "bg-gold text-black"
                : "border border-[#2A2A2A] text-gray-300 hover:bg-[#1F1F00]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Pipeline layout */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
        {visibleGroups.map((group, idx) => {
          const groupAgents = AGENTS.filter(a => a.pipeline === group.id);
          const colors = pipelineColors[group.id];
          const firstAgent = groupAgents[0];
          const isGroupRunning = firstAgent
            ? agentStatuses[firstAgent.name] === "running"
            : false;

          return (
            <div
              key={group.id}
              id={group.sectionId}
              className={`flex gap-6 items-start scroll-mt-6 ${
                idx < visibleGroups.length - 1 ? "mb-10" : ""
              }`}
            >
              {/* Left: pipeline label */}
              <div className="w-44 shrink-0 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${
                      isGroupRunning ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="font-mono text-xs font-bold text-gray-300 tracking-wider">
                    {group.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 italic ml-4">
                  {group.description}
                </p>
              </div>

              {/* Right: agent cards */}
              <div className="flex gap-4 flex-1 flex-wrap">
                {groupAgents.map(agent => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    status={agentStatuses[agent.name] ?? "idle"}
                    colors={colors}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screening progress */}
      {isScreening && (
        <div className="mt-4 bg-[#1A1A00] border border-gold/20 rounded-xl p-4 flex items-center gap-3">
          <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
          <p className="text-gold font-mono text-sm">
            Nick is scanning 50 stocks for entry opportunities...
          </p>
        </div>
      )}

      {/* Cached-result badge */}
      {mounted && analysisResult && !isAnalyzing && analysisResult.timestamp && (
        <div className="flex items-center gap-2 mt-4 text-xs font-mono text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Last analysis: {timeAgo(analysisResult.timestamp)} · {analysisResult.ticker}
          <button
            onClick={handleReset}
            className="ml-2 text-gray-400 hover:text-gold transition-colors"
          >
            Clear ✕
          </button>
        </div>
      )}

      {/* Analysis result */}
      {mounted && analysisResult && (
        <div
          className="mt-8 bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-mono text-xs text-gray-400 tracking-widest">
                ANALYSIS COMPLETE · {analysisResult.ticker}
              </p>
              <h3 className="text-xl font-bold mt-1">
                {analysisResult.currentPrice != null
                  ? `$${analysisResult.currentPrice.toFixed(2)} · ${analysisResult.ticker}`
                  : analysisResult.ticker}
              </h3>
              {analysisResult.timestamp && (
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Analyzed: {timeAgo(analysisResult.timestamp)}
                </p>
              )}
            </div>
            <button
              onClick={handleReset}
              className="text-xs font-mono text-gray-400 hover:text-gray-300 transition-colors"
            >
              Reset ↺
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center bg-[#1A1A1A] rounded-xl p-4">
              <p className="font-mono text-xs text-gray-400 tracking-widest">RECOMMENDATION</p>
              <p
                className={`text-3xl font-bold mt-2 ${
                  analysisResult.recommendation === "BUY"
                    ? "text-gold"
                    : analysisResult.recommendation === "SELL"
                    ? "text-red-500"
                    : analysisResult.recommendation === "WATCH"
                    ? "text-blue-400"
                    : "text-gray-300"
                }`}
              >
                {analysisResult.recommendation}
              </p>
            </div>
            <div className="text-center bg-[#1A1A1A] rounded-xl p-4">
              <p className="font-mono text-xs text-gray-400 tracking-widest">CONFIDENCE</p>
              <p className="text-3xl font-bold mt-2">{analysisResult.confidence}%</p>
            </div>
            <div className="text-center bg-[#1A1A1A] rounded-xl p-4">
              <p className="font-mono text-xs text-gray-400 tracking-widest">QUALITY GATE</p>
              <p
                className={`text-3xl font-bold mt-2 ${
                  analysisResult.quality?.approved ? "text-gold" : "text-red-500"
                }`}
              >
                {analysisResult.quality?.approved ? "PASS" : "FAIL"}
              </p>
              {analysisResult.quality?.passed && (
                <p className="text-[10px] font-mono text-gray-400 mt-1">
                  {analysisResult.quality.passed} checks
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <p className="font-mono text-xs text-gray-400 tracking-widest mb-2">TECHNICAL</p>
              <p className="font-bold text-sm">{analysisResult.technical?.signal ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-1">
                {analysisResult.technical?.reason ?? ""}
              </p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <p className="font-mono text-xs text-gray-400 tracking-widest mb-2">
                NEWS SENTIMENT
              </p>
              <p
                className={`font-bold text-sm ${
                  analysisResult.news?.sentiment === "POSITIVE"
                    ? "text-emerald-600"
                    : analysisResult.news?.sentiment === "NEGATIVE"
                    ? "text-red-600"
                    : "text-amber-600"
                }`}
              >
                {analysisResult.news?.sentiment ?? "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {analysisResult.news?.articles ?? 0} articles · Score:{" "}
                {analysisResult.news?.score ?? 0}
              </p>
            </div>
          </div>

          {/* Nick commentary */}
          <div className="mt-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.dicebear.com/7.x/notionists/svg?seed=nick-portfolio&backgroundColor=ffd89b"
                className="w-10 h-10 rounded-xl shrink-0"
                alt="Nick"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-sm">NICK</span>
                  <span className="font-mono text-xs text-gray-400">PORTFOLIO MANAGER</span>
                  <span className="font-mono text-xs text-gray-400">
                    {new Date().toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {generateCommentary(analysisResult)}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-3">
                  * การวิเคราะห์นี้เป็น paper trading เพื่อการศึกษาเท่านั้น
                  ไม่ใช่คำแนะนำการลงทุน
                </p>
              </div>
            </div>
          </div>

          {/* Top picks (market screener) */}
          {analysisResult.topPicks && analysisResult.topPicks.length > 0 && (
            <div className="mt-6 bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xs text-gray-400 tracking-widest">
                    NICK&apos;S TOP PICKS · {analysisResult.universeScanned} STOCKS SCANNED
                  </p>
                  <h3 className="text-white font-bold text-lg mt-1">
                    Best Entry Opportunities Right Now
                  </h3>
                </div>
                <span className="bg-[#1A1A00] text-gold text-xs font-mono px-3 py-1 rounded-full border border-gold/30">
                  ● LIVE SCAN
                </span>
              </div>

              <div className="space-y-3">
                {analysisResult.topPicks.map((pick, i) => (
                  <div
                    key={pick.ticker}
                    className="flex flex-wrap items-center justify-between gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gold font-mono font-bold text-lg w-6">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-white font-bold text-base">{pick.ticker}</p>
                        <p className="text-gray-400 font-mono text-xs">
                          {pick.price != null ? `$${pick.price.toFixed(2)}` : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className="text-gray-400 font-mono text-xs">RSI</p>
                        <p
                          className={`font-mono font-bold text-sm ${
                            pick.rsi < 40
                              ? 'text-emerald-400'
                              : pick.rsi > 65
                                ? 'text-red-400'
                                : 'text-gray-200'
                          }`}
                        >
                          {pick.rsi}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 font-mono text-xs">vs SMA20</p>
                        <p
                          className={`font-mono font-bold text-sm ${
                            pick.vsSMA?.startsWith('-') ? 'text-emerald-400' : 'text-gray-200'
                          }`}
                        >
                          {pick.vsSMA ?? '—'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 font-mono text-xs">SIGNAL</p>
                        <p
                          className={`font-mono font-bold text-sm ${
                            pick.signal === 'BUY'
                              ? 'text-gold'
                              : pick.signal === 'WATCH'
                                ? 'text-blue-400'
                                : 'text-gray-300'
                          }`}
                        >
                          {pick.signal}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 font-mono text-xs">ENTRY ZONE</p>
                        <p className="text-white font-mono font-bold text-sm">${pick.entryZone}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 font-mono text-xs">SCORE</p>
                        <p className="text-gold font-mono font-bold text-sm">{pick.score}/100</p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push('/trading')}
                      className="bg-[#1A1A00] border border-gold/50 text-gold text-xs font-mono px-3 py-2 rounded-lg hover:bg-gold hover:text-black transition-all"
                    >
                      + Trade
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-gray-500 font-mono text-xs mt-4 text-center">
                * Entry zone = 3% below current price · Not financial advice
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-[#2A2A2A] pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <p className="font-mono text-xs text-gray-500">
          AI STOCK STUDIO · POWERED BY CLAUDE OPUS 4.7
        </p>
        <p className="font-mono text-xs text-gray-500">
          CLICK A CARD TO INSPECT · RUN TO ANALYZE · ESC TO RESET
        </p>
      </footer>

      {/* Watchlist slide-over */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#111111] border-l border-[#2A2A2A] shadow-xl z-50 transform transition-transform duration-300 ${
          showWatchlist ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-[#2A2A2A] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">Watchlist</h3>
            <p className="text-xs font-mono text-gray-400">Yim&apos;s Portfolio · Live</p>
          </div>
          <button
            onClick={() => setShowWatchlist(false)}
            className="text-gray-400 hover:text-gray-300 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
          {WATCHLIST_STOCKS.map(stock => {
            const price = watchlistPrices[stock.ticker];
            const liveValue = price?.last ? stock.shares * price.last : stock.cost;
            const pl = liveValue - stock.cost;
            const plPct = ((pl / stock.cost) * 100).toFixed(2);
            const isPositive = pl >= 0;
            const changeNum = price?.change != null ? parseFloat(price.change) : null;

            return (
              <div
                key={stock.ticker}
                onClick={() => { setShowWatchlist(false); router.push("/diary"); }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 cursor-pointer hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{stock.ticker}</p>
                    <p className="text-xs text-gray-400">{stock.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold tabular-nums">
                      {price?.last != null ? `$${price.last.toFixed(2)}` : "…"}
                    </p>
                    {changeNum != null && (
                      <p className={`text-xs font-mono tabular-nums ${changeNum >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {changeNum >= 0 ? "▲" : "▼"} {Math.abs(changeNum).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-400 font-mono tabular-nums">
                  <span>{stock.shares} shares</span>
                  <span className={isPositive ? "text-emerald-600" : "text-red-500"}>
                    P/L: {isPositive ? "+" : ""}${pl.toFixed(0)} ({isPositive ? "+" : ""}{plPct}%)
                  </span>
                </div>
              </div>
            );
          })}

          <a
            href="/diary"
            className="block w-full text-center py-3 mt-4 border border-gold text-gold rounded-xl text-sm font-medium hover:bg-gold hover:text-white transition-colors"
          >
            View Full Portfolio →
          </a>
        </div>
      </div>

      {/* Overlay */}
      {showWatchlist && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowWatchlist(false)}
        />
      )}
    </div>
  );
}

function AgentCard({
  agent,
  status,
  colors,
}: {
  agent: Agent;
  status: AgentStatus;
  colors: PipelineColors;
}) {
  const isRunning = status === "running";
  const isDone    = status === "done";

  return (
    <div
      className={`relative bg-[#111111] rounded-2xl border p-4 w-52 min-h-[140px] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-md overflow-hidden ${
        isRunning
          ? `${colors.border} shadow-lg ${colors.glow} border-2`
          : "border-[#2A2A2A]"
      } ${isDone ? "opacity-90" : ""}`}
      style={{ borderLeft: `4px solid ${colors.leftColor}` }}
    >
      {/* Status badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {isDone ? (
          <span className="text-blue-400 text-sm leading-none">✓</span>
        ) : (
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? "bg-emerald-400 animate-pulse" : "bg-gray-300"
            }`}
          />
        )}
        <span className="text-[10px] font-mono text-gray-400 uppercase">
          {status}
        </span>
      </div>

      {/* Avatar */}
      <div className={`w-14 h-14 rounded-xl overflow-hidden mb-3 ${colors.bg}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <p className="font-bold text-base text-white">{agent.name}</p>
      <p className="font-mono text-[10px] uppercase text-gray-400 tracking-wider mt-0.5">
        {agent.role}
      </p>
      <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">
        {agent.description}
      </p>

      {/* Running log */}
      {isRunning && (
        <p className="text-[10px] font-mono text-emerald-600 mt-2 animate-pulse">
          Processing…
        </p>
      )}

      {/* Progress bar */}
      {isRunning && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 rounded-b-2xl overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-b-2xl"
            style={{ animation: "agentBar 2s ease-in-out infinite" }}
          />
        </div>
      )}
    </div>
  );
}
