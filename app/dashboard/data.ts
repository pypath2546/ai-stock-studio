// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "done";
export type PipelineId = "orchestrator" | "technical" | "news" | "quality" | "report";
export type PipelineFilter = "all" | PipelineId;
export type SectorFilter = "All" | "Tech" | "AI";

export interface Agent {
  id: string;
  name: string;
  role: string;
  pipeline: PipelineId;
  description: string;
  initials: string;
  avatarIdx: number;   // pravatar.cc image number (1-70)
  runningLog: string;  // mini log shown while running
  doneLog: string;     // shown when status === "done"
}

export interface Stock {
  ticker: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  sector: SectorFilter;
  rsi?: number | null;
  ma20?: number | null;
  ma50?: number | null;
}

export interface PipelineCfg {
  id: PipelineId;
  name: string;
  description: string;
  dot: string;
  border: string;
  gradient: string;
  glow: string;
  label: string;
}

export interface MockAnalysis {
  signal: "BUY" | "HOLD" | "SELL";
  confidence: number;
  signals: string[];
  sentiment: string;
  sentimentScore: number;
}

// ─── Pipeline Config ──────────────────────────────────────────────────────────

export const PIPELINE_CFG: Record<PipelineId, PipelineCfg> = {
  orchestrator: {
    id: "orchestrator",
    name: "ORCHESTRATOR",
    description: "routes every task",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
    gradient: "from-amber-400 to-orange-500",
    glow: "rgba(245,158,11,0.45)",
    label: "text-amber-700",
  },
  technical: {
    id: "technical",
    name: "TECHNICAL PIPELINE",
    description: "price → indicator → signal",
    dot: "bg-blue-500",
    border: "border-l-blue-500",
    gradient: "from-blue-400 to-blue-600",
    glow: "rgba(59,130,246,0.45)",
    label: "text-blue-700",
  },
  news: {
    id: "news",
    name: "NEWS PIPELINE",
    description: "fetch → sentiment → summary",
    dot: "bg-green-500",
    border: "border-l-green-500",
    gradient: "from-green-400 to-emerald-500",
    glow: "rgba(16,185,129,0.45)",
    label: "text-green-700",
  },
  quality: {
    id: "quality",
    name: "QUALITY GATE",
    description: "nothing ships unchecked",
    dot: "bg-red-500",
    border: "border-l-red-500",
    gradient: "from-red-400 to-rose-500",
    glow: "rgba(239,68,68,0.45)",
    label: "text-red-700",
  },
  report: {
    id: "report",
    name: "REPORT",
    description: "run on demand",
    dot: "bg-purple-500",
    border: "border-l-purple-500",
    gradient: "from-purple-400 to-violet-500",
    glow: "rgba(139,92,246,0.45)",
    label: "text-purple-700",
  },
};

export const PIPELINE_ORDER: PipelineId[] = [
  "orchestrator",
  "technical",
  "news",
  "quality",
  "report",
];

// ─── Agents ───────────────────────────────────────────────────────────────────

export const AGENTS: Agent[] = [
  {
    id: "nexus", name: "NEXUS", role: "ORCHESTRATOR", pipeline: "orchestrator", initials: "NX", avatarIdx: 1,
    description: "Never analyzes directly — always delegates to the right agent.",
    runningLog: "Routing task to Technical + News pipelines...",
    doneLog: "Routed to Technical, News, Quality, Report pipelines",
  },
  {
    id: "prism", name: "PRISM", role: "INDICATORS", pipeline: "technical", initials: "PR", avatarIdx: 2,
    description: "Transforms raw price into meaningful signals.",
    runningLog: "Computing RSI, MACD, moving averages...",
    doneLog: "RSI / MACD / MA20 / MA50 computed",
  },
  {
    id: "vector", name: "VECTOR", role: "SIGNAL DETECTION", pipeline: "technical", initials: "VC", avatarIdx: 3,
    description: "Finds patterns humans miss in the noise.",
    runningLog: "Scanning chart for breakout patterns...",
    doneLog: "Pattern scan complete · 1 candidate found",
  },
  {
    id: "apex", name: "APEX", role: "DECISION ENGINE", pipeline: "technical", initials: "AX", avatarIdx: 4,
    description: "Conviction over activity — if in doubt, hold.",
    runningLog: "Weighing technical signals into score...",
    doneLog: "Decision computed from weighted signal score",
  },
  {
    id: "scout", name: "SCOUT", role: "FETCHER", pipeline: "news", initials: "SC", avatarIdx: 5,
    description: "First to the story, last to the rumor.",
    runningLog: "Fetching latest articles from RSS feeds...",
    doneLog: "Articles fetched from Google News",
  },
  {
    id: "lens", name: "LENS", role: "SENTIMENT", pipeline: "news", initials: "LN", avatarIdx: 6,
    description: "Every headline has a hidden bias score.",
    runningLog: "Scoring sentiment for each headline...",
    doneLog: "Sentiment analysis complete · bias flags raised",
  },
  {
    id: "echo", name: "ECHO", role: "SUMMARIZER", pipeline: "news", initials: "EC", avatarIdx: 7,
    description: "Noise becomes signal. Signal becomes edge.",
    runningLog: "Condensing 20+ headlines into key catalysts...",
    doneLog: "Key catalysts extracted from news corpus",
  },
  {
    id: "judge", name: "JUDGE", role: "QUALITY GATE", pipeline: "quality", initials: "JD", avatarIdx: 8,
    description: "A thesis needs evidence, not just confidence.",
    runningLog: "Validating signal criteria against thresholds...",
    doneLog: "Signal criteria validated · threshold met",
  },
  {
    id: "shield", name: "SHIELD", role: "FACT GATE", pipeline: "quality", initials: "SH", avatarIdx: 9,
    description: "Unverified data doesn't pass. Ever.",
    runningLog: "Cross-verifying sources for hallucinations...",
    doneLog: "0 hallucinations · all sources verified",
  },
  {
    id: "sage", name: "SAGE", role: "ANALYST", pipeline: "report", initials: "SG", avatarIdx: 10,
    description: "The report writes itself — after the work is done.",
    runningLog: "Drafting analysis narrative...",
    doneLog: "Full report drafted · ready for review",
  },
  {
    id: "herald", name: "HERALD", role: "PUBLISHER", pipeline: "report", initials: "HR", avatarIdx: 11,
    description: "Formatted. Timestamped. Ready to act on.",
    runningLog: "Formatting and timestamping output...",
    doneLog: "Report published · dashboard updated",
  },
];

export const AGENTS_BY_PIPELINE: Record<PipelineId, Agent[]> = PIPELINE_ORDER.reduce(
  (acc, pid) => {
    acc[pid] = AGENTS.filter((a) => a.pipeline === pid);
    return acc;
  },
  {} as Record<PipelineId, Agent[]>
);

// ─── Mock Stocks (used as fallback when backend is offline) ──────────────────

export const MOCK_STOCKS: Stock[] = [
  { ticker: "NVDA",  company: "NVIDIA Corporation",     price: 875.40,  change: 28.14,  changePercent:  3.32, sector: "AI"   },
  { ticker: "AMD",   company: "Advanced Micro Devices", price: 162.75,  change: -1.84,  changePercent: -1.12, sector: "AI"   },
  { ticker: "MSFT",  company: "Microsoft Corporation",  price: 415.20,  change:  3.58,  changePercent:  0.87, sector: "Tech" },
  { ticker: "AAPL",  company: "Apple Inc.",              price: 189.30,  change:  0.79,  changePercent:  0.42, sector: "Tech" },
  { ticker: "AMZN",  company: "Amazon.com Inc.",         price: 182.45,  change:  2.31,  changePercent:  1.28, sector: "Tech" },
  { ticker: "META",  company: "Meta Platforms Inc.",    price: 508.90,  change: 11.52,  changePercent:  2.31, sector: "Tech" },
  { ticker: "GOOGL", company: "Alphabet Inc.",           price: 172.63,  change:  2.63,  changePercent:  1.55, sector: "Tech" },
  { ticker: "TSLA",  company: "Tesla Inc.",              price: 177.82,  change: -4.47,  changePercent: -2.45, sector: "Tech" },
  { ticker: "PLTR",  company: "Palantir Technologies",  price:  24.18,  change: -0.15,  changePercent: -0.63, sector: "AI"   },
  { ticker: "SMCI",  company: "Super Micro Computer",   price:  83.44,  change: -2.74,  changePercent: -3.17, sector: "AI"   },
];

export const TICKERS = MOCK_STOCKS.map((s) => s.ticker);

export const SECTOR_OF: Record<string, SectorFilter> = Object.fromEntries(
  MOCK_STOCKS.map((s) => [s.ticker, s.sector])
);

// ─── Mock Analysis Results (used as fallback) ────────────────────────────────

export const MOCK_RESULTS: Record<string, MockAnalysis> = {
  NVDA:  { signal: "BUY",  confidence: 87, sentimentScore: 92, sentiment: "Strongly Positive", signals: ["RSI at 62 — momentum without overbought risk", "Price > MA20 > MA50 — confirmed uptrend", "Blackwell GPU demand exceeds supply forecasts"] },
  AMD:   { signal: "HOLD", confidence: 61, sentimentScore: 54, sentiment: "Neutral",           signals: ["RSI at 44 — neutral momentum zone", "Price consolidating below MA20", "MI300X adoption accelerating but gradual"] },
  MSFT:  { signal: "BUY",  confidence: 79, sentimentScore: 78, sentiment: "Positive",          signals: ["Azure AI at $10B+ quarterly run rate", "Golden cross territory forming", "Copilot driving M365 upgrade cycle"] },
  AAPL:  { signal: "HOLD", confidence: 58, sentimentScore: 61, sentiment: "Neutral",           signals: ["RSI at 52 — fully neutral", "Stable above $182 support", "AI supercycle not yet in price"] },
  AMZN:  { signal: "BUY",  confidence: 74, sentimentScore: 76, sentiment: "Positive",          signals: ["AWS re-accelerating at 28% growth", "MACD bullish crossover confirmed", "Bedrock gaining enterprise customers fast"] },
  META:  { signal: "HOLD", confidence: 67, sentimentScore: 71, sentiment: "Positive",          signals: ["RSI at 61 — approaching overbought", "Reels monetization ahead of estimates", "Watch $520 resistance level closely"] },
  GOOGL: { signal: "BUY",  confidence: 75, sentimentScore: 74, sentiment: "Positive",          signals: ["Golden cross territory confirmed", "Gemini integration boosting Search engagement", "Ad revenue recovery beats estimates"] },
  TSLA:  { signal: "SELL", confidence: 72, sentimentScore: 32, sentiment: "Negative",          signals: ["RSI at 38 — no reversal signal yet", "Price below MA20 and MA50", "Margin compression from price cuts continues"] },
  PLTR:  { signal: "HOLD", confidence: 55, sentimentScore: 55, sentiment: "Neutral",           signals: ["RSI at 41 — neutral to bearish", "AIP adoption growing but slowly", "$22 support level being tested"] },
  SMCI:  { signal: "SELL", confidence: 69, sentimentScore: 28, sentiment: "Negative",          signals: ["RSI at 28 — oversold, no reversal confirmed", "Accounting review creates binary risk event", "Price deep below both moving averages"] },
};

// ─── Filter tab definitions ───────────────────────────────────────────────────

export const PIPELINE_FILTER_TABS: { id: PipelineFilter; label: string }[] = [
  { id: "all",          label: "All Agents"   },
  { id: "orchestrator", label: "Orchestrator" },
  { id: "technical",    label: "Technical"    },
  { id: "news",         label: "News"         },
  { id: "quality",      label: "Quality"      },
  { id: "report",       label: "Report"       },
];

export const SECTOR_FILTER_TABS: SectorFilter[] = ["All", "Tech", "AI"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a signal from a backend score (-7..+7-ish) into BUY/HOLD/SELL */
export function deriveSignal(score: number): "BUY" | "HOLD" | "SELL" {
  if (score >= 3) return "BUY";
  if (score <= -3) return "SELL";
  return "HOLD";
}

/** Generate a fake 7-point sparkline series anchored to the current price */
export function fakeSparkline(price: number, seed: number): number[] {
  const out: number[] = [];
  let v = price * 0.96;
  for (let i = 0; i < 7; i++) {
    const noise = (Math.sin(seed + i * 1.7) + Math.cos(seed * 0.5 + i)) * (price * 0.012);
    v = v + noise;
    out.push(v);
  }
  out[out.length - 1] = price;  // anchor end to current price
  return out;
}
