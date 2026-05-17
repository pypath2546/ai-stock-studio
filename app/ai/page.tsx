"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useNewsOutline } from "@/lib/news-outline-context";

type AgentStatus = "idle" | "running" | "done";

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

interface AnalysisResult {
  recommendation: string;
  confidence: number;
  sentiment: number;
  signals: string[];
}

const pipelineColors: Record<string, PipelineColors> = {
  Orchestrator:   { dot: "bg-amber-400",  border: "border-amber-300",  leftColor: "#fbbf24", bg: "bg-amber-50",  glow: "shadow-amber-200" },
  Technical:      { dot: "bg-blue-400",   border: "border-blue-300",   leftColor: "#60a5fa", bg: "bg-blue-50",   glow: "shadow-blue-200" },
  News:           { dot: "bg-green-400",  border: "border-green-300",  leftColor: "#4ade80", bg: "bg-green-50",  glow: "shadow-green-200" },
  "Quality Gate": { dot: "bg-red-400",    border: "border-red-300",    leftColor: "#f87171", bg: "bg-red-50",    glow: "shadow-red-200" },
  Report:         { dot: "bg-purple-400", border: "border-purple-300", leftColor: "#c084fc", bg: "bg-purple-50", glow: "shadow-purple-200" },
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

const AGENT_ORDER = [
  ["KIRA"],
  ["RENZO", "SABLE", "DRIX"],
  ["NICO", "VERA", "ZOLA"],
  ["CAIN", "NORA"],
  ["ATLAS", "FINN"],
];

const AI_OUTLINE = [
  { href: "#ai-orchestrator", label: "Orchestrator" },
  { href: "#ai-technical",    label: "Technical Pipeline" },
  { href: "#ai-news",         label: "News Pipeline" },
  { href: "#ai-quality",      label: "Quality Gate" },
  { href: "#ai-report",       label: "Report" },
];

export default function AIPage() {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [activePipeline, setActivePipeline] = useState("All");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { setItems } = useNewsOutline();

  useEffect(() => {
    setItems(AI_OUTLINE);
    return () => setItems(null);
  }, [setItems]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAgentStatuses({});
    setAnalysisResult(null);

    for (const group of AGENT_ORDER) {
      setAgentStatuses(prev => ({
        ...prev,
        ...Object.fromEntries(group.map(name => [name, "running" as AgentStatus])),
      }));
      await new Promise(r => setTimeout(r, 1500));
      setAgentStatuses(prev => ({
        ...prev,
        ...Object.fromEntries(group.map(name => [name, "done" as AgentStatus])),
      }));
      await new Promise(r => setTimeout(r, 300));
    }

    setAnalysisResult({
      recommendation: "HOLD",
      confidence: 87,
      sentiment: 0.72,
      signals: [
        "Technical: NVDA showing bullish divergence on RSI",
        "News: Positive sentiment across AI sector (+0.72)",
        "Quality: All 7 holdings pass kill conditions",
      ],
    });
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setAgentStatuses({});
    setAnalysisResult(null);
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
            <h1 className="text-4xl font-bold text-gray-900">
              AI <span className="italic text-amber-600">Studio.</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-mono">
              {AGENTS.length} AGENTS · {PIPELINE_GROUPS.length} PIPELINES · 1 ORCHESTRATOR · {errCount} ERRORS
              {totalDone > 0 && ` · ${totalDone} DONE`}
              {totalRunning > 0 && ` · ${totalRunning} RUNNING`}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {analysisResult && (
              <button
                onClick={handleReset}
                className="px-4 py-3 border border-[#E0D9C8] text-gray-600 rounded-xl hover:bg-[#F0E8D8] transition-all text-sm font-mono"
              >
                Reset ↺
              </button>
            )}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-[#4a5c3f] text-white rounded-xl hover:bg-[#5a7a4a] disabled:opacity-50 transition-all font-medium"
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
                  ? "bg-[#4a5c3f] text-white"
                  : "border border-[#E0D9C8] text-gray-600 hover:bg-[#F0E8D8]"
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

      {/* Pipeline layout */}
      <div className="bg-white border border-[#E0D9C8] rounded-2xl p-6">
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
                  <span className="font-mono text-xs font-bold text-gray-700 tracking-wider">
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

      {/* Analysis result */}
      {analysisResult && (
        <div
          className="mt-8 bg-white border border-[#E0D9C8] rounded-2xl p-6"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Analysis Complete</h3>
            <button
              onClick={handleReset}
              className="text-xs font-mono text-gray-400 hover:text-gray-600 transition-colors"
            >
              Reset ↺
            </button>
          </div>

          <div className="flex flex-wrap gap-8">
            <div className="text-center">
              <p className="font-mono text-xs text-gray-400 tracking-widest">RECOMMENDATION</p>
              <p
                className={`text-4xl font-bold mt-1 ${
                  analysisResult.recommendation === "BUY"
                    ? "text-emerald-600"
                    : analysisResult.recommendation === "SELL"
                    ? "text-red-600"
                    : "text-amber-600"
                }`}
              >
                {analysisResult.recommendation}
              </p>
            </div>

            <div className="text-center">
              <p className="font-mono text-xs text-gray-400 tracking-widest">CONFIDENCE</p>
              <p className="text-4xl font-bold mt-1 text-gray-900">
                {analysisResult.confidence}%
              </p>
            </div>

            <div className="text-center">
              <p className="font-mono text-xs text-gray-400 tracking-widest">NEWS SENTIMENT</p>
              <p className="text-4xl font-bold mt-1 text-blue-600">
                +{analysisResult.sentiment}
              </p>
            </div>

            <div className="flex-1 min-w-[200px]">
              <p className="font-mono text-xs text-gray-400 tracking-widest mb-3">KEY SIGNALS</p>
              {analysisResult.signals.map((signal, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-emerald-500 mt-0.5 shrink-0">●</span>
                  <span className="text-sm text-gray-600">{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-[#E0D9C8] pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <p className="font-mono text-xs text-gray-400">
          AI STOCK STUDIO · POWERED BY CLAUDE OPUS 4.7
        </p>
        <p className="font-mono text-xs text-gray-400">
          CLICK A CARD TO INSPECT · RUN TO ANALYZE · ESC TO RESET
        </p>
      </footer>
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
      className={`relative bg-white rounded-2xl border p-4 w-52 min-h-[140px] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-md overflow-hidden ${
        isRunning
          ? `${colors.border} shadow-lg ${colors.glow} border-2`
          : "border-[#E0D9C8]"
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
      <p className="font-bold text-base text-gray-900">{agent.name}</p>
      <p className="font-mono text-[10px] uppercase text-gray-400 tracking-wider mt-0.5">
        {agent.role}
      </p>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
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
