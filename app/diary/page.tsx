"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import { useNewsOutline } from "@/lib/news-outline-context";

interface Holding {
  ticker: string;
  company: string;
  status: "intact" | "evolving" | "at-risk";
  shares: number;
  cost: number;
  last: number;
  position: number;
  weight: number;
}

interface Thesis {
  snapshot: string;
  thesis: string;
  killConditions: string[];
  weight: string;
  horizon: string;
}

interface ScreenedStock {
  ticker: string;
  status: "SELECTED" | "DISQUALIFIED" | "PASSED";
  notes: string;
}

const SNAPSHOTS = [
  { date: "2026-04-19", label: "Seed" },
  { date: "2026-04-25", label: "Wk 1" },
  { date: "2026-05-03", label: "Wk 2" },
] as const;

const CHART_DATA = [
  { date: "04-19", nick: 0, spy: 0, qqq: 0, soxx: 0 },
  { date: "04-25", nick: 2.9, spy: 0.5, qqq: 0.8, soxx: -0.3 },
  { date: "05-03", nick: 7.8, spy: 1.5, qqq: 2.1, soxx: 1.8 },
];

const HOLDINGS: Holding[] = [
  { ticker: "GOOGL", company: "Alphabet Inc. Class A", status: "intact", shares: 7, cost: 2392, last: 341.71, position: 2392, weight: 23.9 },
  { ticker: "AVGO", company: "Broadcom Inc.", status: "intact", shares: 4, cost: 1626, last: 406.50, position: 1626, weight: 16.3 },
  { ticker: "AMZN", company: "Amazon.com Inc.", status: "intact", shares: 6, cost: 1503, last: 250.50, position: 1503, weight: 15.0 },
  { ticker: "UBER", company: "Uber Technologies Inc.", status: "intact", shares: 18, cost: 1388, last: 77.11, position: 1388, weight: 13.9 },
  { ticker: "CRWD", company: "CrowdStrike Holdings Inc.", status: "intact", shares: 2, cost: 848, last: 424.00, position: 848, weight: 8.5 },
  { ticker: "RBRK", company: "Rubrik Inc.", status: "intact", shares: 16, cost: 837, last: 52.31, position: 837, weight: 8.4 },
  { ticker: "SOI.PA", company: "Soitec SA (Euronext Paris)", status: "intact", shares: 7, cost: 806, last: 115.14, position: 806, weight: 8.1 },
];

const THESES: Record<string, Thesis> = {
  GOOGL: {
    snapshot: "Seeded at inception. Confirmed at filing grade.",
    thesis:
      "Alphabet has structural advantages compounding: TPU vertical integration cuts AI inference cost by 78% vs NVIDIA. $240B Cloud backlog as of Q1 2026 signals durable enterprise demand. The 'goes dark on Amazon' incident proved network effects in ad-network economics. Sum-of-parts implies ~40% upside vs current cap.",
    killConditions: [
      "Search market share drops below 75% globally for 2 consecutive quarters",
      "Cloud growth decelerates below 25% YoY despite backlog conversion",
      "Antitrust enforcement forces structural separation of Search and Cloud",
    ],
    weight: "23.9%",
    horizon: "5-10 years",
  },
  AVGO: {
    snapshot: "Seeded at inception. See the initial portfolio file for the full thesis at seeding.",
    thesis:
      "Broadcom is diversification within AI infrastructure, not duplication with NVIDIA. ~75% of revenue is vendor-diversified (networking silicon + infrastructure software) and ~25% is the high-growth/high-concentration ASIC segment. The networking leg (Tomahawk 6 at 102.4 Tbps) captures demand from every hyperscaler regardless of whose ASIC wins.",
    killConditions: [
      "VMware mid-market churn + ASIC dual-sourcing margin erosion in same quarterly print",
      "Cisco Silicon One tape-out at 102.4 Tbps with hyperscaler volume deployment",
      "Broadcom AI revenue line grows <50% YoY for 2 consecutive quarters",
    ],
    weight: "16.3%",
    horizon: "3-5 years",
  },
  AMZN: {
    snapshot: "Seeded at inception. KC#1 falsified at filing grade — thesis strengthens.",
    thesis:
      "Amazon's Trainium 3 reaches 1/3 NVIDIA's training cost at scale. AWS holds 60% MCP (managed compute platform) share. The Anthropic + OpenAI compute partnership locks in workloads through 2028. Logistics network now operates at 12% margin, up from 4% pre-pandemic.",
    killConditions: [
      "AWS revenue growth drops below 15% YoY",
      "Trainium adoption stalls; NVIDIA H200 retains >85% AI training share",
      "Retail margin compresses below 6% due to logistics cost inflation",
    ],
    weight: "15.0%",
    horizon: "3-7 years",
  },
  UBER: {
    snapshot: "Seeded at inception. Tracking quarterly margin progression.",
    thesis:
      "Uber is past the unit economics inflection point. EBITDA margin expanded from -8% to +14% in 4 years. Mobility take rate stable at 22%. Delivery becoming Amazon-style ad business with 6% margin. Robotaxi optionality with Waymo partnership.",
    killConditions: [
      "Take rate compression below 20% due to regulatory pricing rules",
      "Free cash flow growth decelerates below 30% YoY",
      "Class action settlement forces driver reclassification in 3+ major markets",
    ],
    weight: "13.9%",
    horizon: "3-5 years",
  },
  CRWD: {
    snapshot: "Seeded at inception. Cybersecurity consolidation thesis tracking.",
    thesis:
      "CrowdStrike consolidates the security stack. Falcon platform now spans 28 modules with 65% of customers using 5+. NRR holding at 119% despite enterprise spending pressure. AI-native architecture means lower marginal cost per detection vs SIEM competitors.",
    killConditions: [
      "Net retention rate drops below 110%",
      "Major outage (>4h) for top-100 enterprise customers",
      "Microsoft Defender wins 3+ large displacement deals from CrowdStrike",
    ],
    weight: "8.5%",
    horizon: "5-7 years",
  },
  RBRK: {
    snapshot: "Seeded at inception. Data resilience secular tailwind intact.",
    thesis:
      "Rubrik leads data resilience in the ransomware era. Land-and-expand motion working: 65% of revenue from customers acquired >12 months ago. Zero-trust architecture means competitive moat deepens with each customer addition. ARR growing 30%+ with improving unit economics.",
    killConditions: [
      "ARR growth decelerates below 20% YoY",
      "Average contract value compresses for 2 consecutive quarters",
      "Major breach incident exposes Rubrik-protected customer data",
    ],
    weight: "8.4%",
    horizon: "5-7 years",
  },
  "SOI.PA": {
    snapshot: "Seeded at inception. Position-sizing question, not kill-condition question.",
    thesis:
      "Soitec dominates SOI (silicon-on-insulator) wafers — the substrate beneath RF chips in every smartphone. 5G modem complexity drives content growth. FD-SOI adoption accelerating in automotive radar. Asymmetric exposure to handset cycle recovery.",
    killConditions: [
      "Apple modem in-housing reduces Soitec RF-SOI orders by >40%",
      "FD-SOI loses major automotive design win to bulk CMOS competitor",
      "Gross margin compresses below 30% on capacity utilization issues",
    ],
    weight: "9.66%",
    horizon: "3-5 years",
  },
};

const SCREENED: ScreenedStock[] = [
  { ticker: "NVDA", status: "DISQUALIFIED", notes: "Moat deepening: programmability absorbs algorithm shifts, release-cadence gap, price-stability commitment, 6-supplier capacity preemption. Disqualified for seed only: concentrated single-name AI exposure; AVGO + AMZN capture the same tailwind with less single-source risk." },
  { ticker: "AVGO", status: "SELECTED", notes: "Shortlist. 75% of revenue is vendor-diversified (networking + software); ASIC segment is the high-growth 25%. Networking physics moat plus Cisco full-stack threat tripwire is monitorable." },
  { ticker: "GOOGL", status: "SELECTED", notes: "Shortlist. TPU vertical integration, $240B Cloud backlog, Gemini 78% cost cut, ad-network 'goes dark' in 48h when Amazon paused test. Yim's own file notes cashflow multiple elevated — but the moat-deepening evidence dominates." },
  { ticker: "AMZN", status: "SELECTED", notes: "Shortlist. Trainium 1/3 manufacturing cost vs NVIDIA; 60% MCP share; S3 AI-workload exploding; Anthropic + OpenAI stakes as ad-disruption hedge. Sum-of-parts implies ~40% upside vs current cap." },
  { ticker: "TSM", status: "PASSED", notes: "Confirmed thesis (#4), DTCO switching cost deepening per node. Passed for seed: v3 update — I examined the second-foundry beneficiary (Samsung Foundry via SMSN.L) and concluded the hedge does not exist cleanly — Samsung Foundry is not leading at 2nm/3nm GAA either." },
  { ticker: "ASML", status: "PASSED", notes: "EUV monopoly; memory + logic re-acceleration confirmed Q1 2026. Passed: lithography is one layer further upstream than I need at this capital; AVGO captures a wider slice of the AI tailwind for the same dollar." },
  { ticker: "MU", status: "PASSED", notes: "HBM structural winner, US-executable proxy for SK Hynix thesis. Passed: Yim's KB flags Micron at 2026 price after a huge run. Cyclical-to-structural transition thesis still needs one more full downcycle to confirm." },
];

const BENCHMARKS = [
  { key: "SPY", label: "SPY", sub: "S&P 500", color: "#888" },
  { key: "QQQ", label: "QQQ", sub: "Nasdaq-100", color: "#3b82f6" },
  { key: "SOXX", label: "SOXX", sub: "Semiconductor", color: "#f97316" },
] as const;

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

const DASHBOARD_OUTLINE = [
  { href: "#dashboard-stats", label: "Stats Overview" },
  { href: "#dashboard-performance", label: "Performance Chart" },
  { href: "#dashboard-actions", label: "Recommended Actions" },
  { href: "#dashboard-holdings", label: "Holdings" },
  { href: "#dashboard-screened", label: "Considered & Passed" },
];

const ABOUT_OUTLINE = [
  { href: "#about-profile", label: "Profile" },
  { href: "#about-bio", label: "Who Nick is" },
  { href: "#about-mandate", label: "Mandate & Rules" },
  { href: "#about-blocklist", label: "Blocklist" },
];

export default function DiaryPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "about">("dashboard");
  const [activeSnapshot, setActiveSnapshot] = useState(2);
  const [activeBenchmarks, setActiveBenchmarks] = useState<string[]>(["SPY"]);
  const [selectedHolding, setSelectedHolding] = useState<string | null>(null);
  const { setItems } = useNewsOutline();

  useEffect(() => {
    const base = activeTab === "dashboard" ? DASHBOARD_OUTLINE : ABOUT_OUTLINE;
    const tabSwitcher = [
      { href: "#tab-dashboard", label: activeTab === "dashboard" ? "● Dashboard" : "Dashboard" },
      { href: "#tab-about", label: activeTab === "about" ? "● About Nick" : "About Nick" },
    ];
    setItems([...tabSwitcher, ...base]);
    return () => setItems(null);
  }, [activeTab, setItems]);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <FolderTabs activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === "dashboard" ? (
        <DashboardTab
          activeSnapshot={activeSnapshot}
          setActiveSnapshot={setActiveSnapshot}
          activeBenchmarks={activeBenchmarks}
          setActiveBenchmarks={setActiveBenchmarks}
          selectedHolding={selectedHolding}
          setSelectedHolding={setSelectedHolding}
        />
      ) : (
        <AboutTab />
      )}
    </div>
  );
}

function FolderTabs({
  activeTab,
  onSelect,
}: {
  activeTab: "dashboard" | "about";
  onSelect: (t: "dashboard" | "about") => void;
}) {
  return (
    <div className="flex items-end gap-1 border-b border-[#E0D9C8]">
      <button
        id="tab-dashboard"
        onClick={() => onSelect("dashboard")}
        className={
          activeTab === "dashboard"
            ? "bg-white border-x border-t border-[#E0D9C8] -mb-px px-5 py-2.5 rounded-t-lg text-sm font-medium text-[#2a2a2a]"
            : "bg-[#E8E0CC] text-gray-600 hover:bg-[#DDD4BE] px-5 py-2.5 rounded-t-lg text-sm transition-colors"
        }
      >
        Dashboard
      </button>
      <button
        id="tab-about"
        onClick={() => onSelect("about")}
        className={
          activeTab === "about"
            ? "bg-white border-x border-t border-[#E0D9C8] -mb-px px-5 py-2.5 rounded-t-lg text-sm font-medium text-[#2a2a2a]"
            : "bg-[#E8E0CC] text-gray-600 hover:bg-[#DDD4BE] px-5 py-2.5 rounded-t-lg text-sm transition-colors"
        }
      >
        About Nick
      </button>
    </div>
  );
}

function DashboardTab({
  activeSnapshot,
  setActiveSnapshot,
  activeBenchmarks,
  setActiveBenchmarks,
  selectedHolding,
  setSelectedHolding,
}: {
  activeSnapshot: number;
  setActiveSnapshot: (i: number) => void;
  activeBenchmarks: string[];
  setActiveBenchmarks: (b: string[]) => void;
  selectedHolding: string | null;
  setSelectedHolding: (t: string | null) => void;
}) {
  return (
    <div className="pt-8">
      <PageHeader />
      <StatsBar />
      <TimelineSlider activeSnapshot={activeSnapshot} onSelect={setActiveSnapshot} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        <PerformanceChart
          activeBenchmarks={activeBenchmarks}
          setActiveBenchmarks={setActiveBenchmarks}
        />
        <RecommendedActions />
      </div>

      <HoldingsSection
        selectedHolding={selectedHolding}
        setSelectedHolding={setSelectedHolding}
      />

      <ScreenedSection />

      <ReferencesFooter />
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-end gap-3">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Nick&apos;s Portfolio
          <span className="text-xl text-gray-400 ml-3 font-normal">Yim&apos;s Diary</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Blinded $10K paper portfolio · Nick Sleep-style discipline
        </p>
      </div>
      <div className="text-right font-mono text-xs text-gray-500 space-y-0.5">
        <div>Inception 2026-04-17</div>
        <div>Last updated 2026-05-06</div>
        <div>2 weekly snapshots logged</div>
      </div>
    </div>
  );
}

function StatsBar() {
  return (
    <div id="dashboard-stats" className="bg-[#4a5c3f] text-white rounded-xl p-6 my-6 grid grid-cols-2 md:grid-cols-5 gap-6 scroll-mt-6">
      <div>
        <div className="text-xs opacity-50 font-mono">2026-05-03</div>
        <div className="text-3xl font-bold mt-1">2026-05-03</div>
      </div>
      <div>
        <div className="text-xs opacity-60 tracking-widest font-mono">NET LIQUIDATION</div>
        <div className="text-3xl font-bold tabular-nums mt-1">$10,780.31</div>
        <div className="text-xs opacity-70 mt-1">+7.80% since inception</div>
      </div>
      <div>
        <div className="text-xs opacity-60 tracking-widest font-mono">VS SPY</div>
        <div className="text-3xl font-bold text-emerald-300 mt-1">+6.32pp</div>
        <div className="text-xs opacity-70 mt-1">SPY +1.48%</div>
      </div>
      <div>
        <div className="text-xs opacity-60 tracking-widest font-mono">HOLDINGS</div>
        <div className="text-3xl font-bold mt-1">7</div>
        <div className="text-xs opacity-70 mt-1">cash $599 · 5.6%</div>
      </div>
      <div>
        <div className="text-xs opacity-60 tracking-widest font-mono">WEEKS ALIVE</div>
        <div className="text-3xl font-bold mt-1">2</div>
        <div className="text-xs opacity-70 mt-1">0 actions this week</div>
      </div>
    </div>
  );
}

function TimelineSlider({
  activeSnapshot,
  onSelect,
}: {
  activeSnapshot: number;
  onSelect: (i: number) => void;
}) {
  const progressPct = (activeSnapshot / (SNAPSHOTS.length - 1)) * 100;

  return (
    <div className="bg-white border border-[#E0D9C8] rounded-xl p-5">
      <p className="font-mono text-xs text-gray-400 tracking-widest mb-3">TIMELINE</p>

      <div className="relative h-3">
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-[#E0D9C8]" />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-[#4a5c3f] transition-all"
          style={{ width: `${progressPct}%` }}
        />
        {SNAPSHOTS.map((_, i) => {
          const left = (i / (SNAPSHOTS.length - 1)) * 100;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-label={`Snapshot ${i + 1}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#4a5c3f] hover:scale-125 transition-transform"
              style={{ left: `${left}%` }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {SNAPSHOTS.map((s, i) => (
          <button
            key={s.date}
            onClick={() => onSelect(i)}
            className={
              i === activeSnapshot
                ? "bg-[#4a5c3f] text-white px-4 py-1.5 rounded-full text-sm font-mono"
                : "border border-[#E0D9C8] text-gray-600 px-4 py-1.5 rounded-full text-sm font-mono hover:bg-[#F5F0E8] transition-colors"
            }
          >
            {s.date} · {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerformanceChart({
  activeBenchmarks,
  setActiveBenchmarks,
}: {
  activeBenchmarks: string[];
  setActiveBenchmarks: (b: string[]) => void;
}) {
  const toggleBenchmark = (key: string) => {
    if (activeBenchmarks.includes(key)) {
      setActiveBenchmarks(activeBenchmarks.filter((k) => k !== key));
    } else {
      setActiveBenchmarks([...activeBenchmarks, key]);
    }
  };

  const areaData = useMemo(
    () =>
      CHART_DATA.map((d) => ({
        ...d,
        gap: [d.spy, d.nick] as [number, number],
      })),
    [],
  );

  return (
    <div id="dashboard-performance" className="lg:col-span-3 bg-white border border-[#E0D9C8] rounded-xl p-5 scroll-mt-6">
      <p className="font-mono text-xs text-gray-400 tracking-widest">PERFORMANCE VS BENCHMARK</p>
      <h2 className="text-xl font-bold mt-1">Cumulative return since inception</h2>

      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {BENCHMARKS.map((b) => {
          const active = activeBenchmarks.includes(b.key);
          return (
            <button
              key={b.key}
              onClick={() => toggleBenchmark(b.key)}
              className={
                active
                  ? "bg-[#4a5c3f] text-white px-3 py-1 rounded-full text-xs font-mono"
                  : "border border-[#E0D9C8] text-gray-600 px-3 py-1 rounded-full text-xs font-mono hover:bg-[#F5F0E8] transition-colors"
              }
            >
              {b.label} <span className="opacity-70">{b.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="h-72 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={areaData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D8" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#888", fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#E0D9C8" }}
              tickLine={false}
            />
            <YAxis
              domain={[-2, 10]}
              tick={{ fontSize: 11, fill: "#888", fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#FDFAF4",
                border: "1px solid #E0D9C8",
                borderRadius: "0.5rem",
                fontSize: "12px",
                fontFamily: "JetBrains Mono",
              }}
              formatter={((value: unknown, name: unknown) => {
                if (name === "gap") return ["", ""];
                const num = typeof value === "number" ? value : Number(value);
                if (Number.isNaN(num)) return ["—", String(name)];
                return [`${num >= 0 ? "+" : ""}${num.toFixed(1)}%`, String(name)];
              }) as never}
            />

            <Area
              dataKey="gap"
              fill="#D4B98C"
              fillOpacity={0.3}
              stroke="none"
              isAnimationActive={false}
              legendType="none"
            />

            {activeBenchmarks.includes("SPY") && (
              <Line
                type="monotone"
                dataKey="spy"
                name="SPY"
                stroke="#888"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#888" }}
                isAnimationActive={false}
              />
            )}
            {activeBenchmarks.includes("QQQ") && (
              <Line
                type="monotone"
                dataKey="qqq"
                name="QQQ"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#3b82f6" }}
                isAnimationActive={false}
              />
            )}
            {activeBenchmarks.includes("SOXX") && (
              <Line
                type="monotone"
                dataKey="soxx"
                name="SOXX"
                stroke="#f97316"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#f97316" }}
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="nick"
              name="Nick NAV"
              stroke="#1a1a1a"
              strokeWidth={2}
              dot={{ r: 5, fill: "#1a1a1a" }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="nick"
                position="top"
                offset={10}
                formatter={(value: React.ReactNode) => {
                  const v = typeof value === "number" ? value : Number(value);
                  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
                }}
                style={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "#1a1a1a" }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-mono mt-3">
        <span>— Nick NAV</span>
        <span>·· SPY · S&amp;P 500</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-[#D4B98C] opacity-60 rounded-sm" /> Relative gap
        </span>
      </div>

      <p className="italic text-xs text-gray-400 mt-3 leading-relaxed">
        Cumulative simple return on a $10K seed. With zero cash flows since inception, TWR = MWR — the line is the honest return either way.
      </p>
    </div>
  );
}

function RecommendedActions() {
  const cards = [
    {
      head: "No kill condition was hit",
      body:
        "Every one of the seven holdings passes the structural tripwire test for the week. AMZN got direct kill-condition falsification on KC#1 at filing grade. GOOGL got T9-Confirmed reinforcement at filing grade.",
    },
    {
      head: "Soitec weight at 9.66% is not a trim trigger",
      body:
        "The move is on price, not adds. Trimming on a price move ahead of the named earnings checkpoint (May 27) violates the rule that kill conditions resolve thesis questions, not price moves.",
    },
    {
      head: "Cash at 5.56% is dry powder, not deployment signal",
      body:
        "None of the v3 watchlist names triggered a buy this week. The 2026-04-30 ZETA Q1'26 file flags ZETA's promotion-to-Confirmed candidate status.",
    },
    {
      head: "Yim execution window",
      body:
        "Yim places orders manually within 1 hour of US market open. No stop orders. Long-term conviction, not stop-loss risk management.",
    },
  ];

  return (
    <div id="dashboard-actions" className="lg:col-span-2 bg-white border border-[#E0D9C8] rounded-xl p-5 scroll-mt-6">
      <p className="font-mono text-xs text-gray-400 tracking-widest">RECOMMENDED ACTIONS</p>
      <h2 className="text-lg font-bold mt-1">No actions this week — hold all positions</h2>
      <span className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs inline-block mt-3 mb-4 font-mono">
        ● 0 actions
      </span>

      <div className="space-y-3">
        {cards.map((c) => (
          <div key={c.head} className="bg-[#F8F5EE] border border-[#E0D9C8] rounded-lg p-4">
            <div className="font-bold text-sm">{c.head}</div>
            <div className="text-xs text-gray-600 leading-relaxed mt-2">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingsSection({
  selectedHolding,
  setSelectedHolding,
}: {
  selectedHolding: string | null;
  setSelectedHolding: (t: string | null) => void;
}) {
  return (
    <section id="dashboard-holdings" className="mt-12 scroll-mt-6">
      <p className="font-mono text-xs text-gray-400 tracking-widest">
        HOLDINGS · CLICK ANY ROW FOR THE THESIS
      </p>
      <h2 className="text-2xl font-bold mt-1 mb-4">Brokerage view</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className={selectedHolding ? "lg:col-span-3" : "lg:col-span-5"}>
          <HoldingsTable
            selectedHolding={selectedHolding}
            onSelect={(t) =>
              setSelectedHolding(selectedHolding === t ? null : t)
            }
          />
        </div>
        {selectedHolding && (
          <div className="lg:col-span-2">
            <ThesisPanel
              ticker={selectedHolding}
              onClose={() => setSelectedHolding(null)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function HoldingsTable({
  selectedHolding,
  onSelect,
}: {
  selectedHolding: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="bg-white border border-[#E0D9C8] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F5EE] border-b border-[#E0D9C8] text-xs text-gray-500 font-mono tracking-wider uppercase">
              <th className="px-4 py-3 text-left">Ticker</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Last</th>
              <th className="px-4 py-3 text-right">Position</th>
              <th className="px-4 py-3 text-left">Weight</th>
              <th className="px-4 py-3 text-right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {HOLDINGS.map((h) => {
              const selected = selectedHolding === h.ticker;
              return (
                <tr
                  key={h.ticker}
                  onClick={() => onSelect(h.ticker)}
                  className={
                    selected
                      ? "bg-[#EEE8D8] border-l-4 border-l-[#4a5c3f] cursor-pointer transition-colors border-b border-b-[#F0E8D8]"
                      : "hover:bg-[#F5F0E8] cursor-pointer transition-colors border-b border-[#F0E8D8]"
                  }
                >
                  <td className="px-4 py-3">
                    <div className="font-bold">{h.ticker}</div>
                    <div className="text-xs text-gray-500">{h.company}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-xs font-mono">
                      ● {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{h.shares}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtInt(h.cost)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtCurrency(h.last)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtInt(h.position)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E0D9C8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4a5c3f] rounded-full"
                          style={{ width: `${Math.min(h.weight * 4, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm tabular-nums">{h.weight}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-emerald-600 font-mono tabular-nums text-sm">▲ +$0</div>
                    <div className="text-xs text-gray-400 font-mono tabular-nums">+0.0%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThesisPanel({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const t = THESES[ticker];
  const h = HOLDINGS.find((h) => h.ticker === ticker);
  if (!t || !h) return null;

  return (
    <div className="bg-white border border-[#E0D9C8] rounded-xl p-5 sticky top-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start justify-between">
        <p className="font-mono text-xs text-gray-400 tracking-widest">THESIS &amp; KILL CONDITIONS</p>
        <button
          onClick={onClose}
          aria-label="Close thesis panel"
          className="text-gray-400 hover:text-[#2a2a2a] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <div className="text-xs text-gray-500">{h.company}</div>
        <div className="text-4xl font-bold mt-1">{ticker}</div>
        <div className="flex items-center gap-3 mt-2">
          <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-xs font-mono">
            ● intact
          </span>
          <span className="font-mono text-xs text-gray-500">
            {t.weight} · {t.horizon}
          </span>
        </div>
      </div>

      <div className="space-y-4 mt-5">
        <div>
          <p className="font-mono text-xs text-gray-400 tracking-widest">THIS SNAPSHOT</p>
          <p className="italic text-sm text-gray-600 mt-1.5">{t.snapshot}</p>
        </div>

        <div>
          <p className="font-mono text-xs text-gray-400 tracking-widest">ORIGINAL THESIS</p>
          <p className="text-sm leading-relaxed text-gray-700 mt-1.5">{t.thesis}</p>
        </div>

        <div>
          <p className="font-mono text-xs text-gray-400 tracking-widest mb-2">KILL CONDITIONS</p>
          {t.killConditions.map((kc, i) => (
            <div
              key={i}
              className="border border-[#E0D9C8] rounded-lg p-3 mb-2 flex gap-2"
            >
              <span className="text-[#4a5c3f] text-xs leading-relaxed">◎</span>
              <span className="text-xs text-gray-600 leading-relaxed">{kc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenedSection() {
  const badgeClass = (s: ScreenedStock["status"]) => {
    if (s === "SELECTED") return "bg-emerald-100 text-emerald-700";
    if (s === "DISQUALIFIED") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <section id="dashboard-screened" className="mt-12 scroll-mt-6">
      <h2 className="text-xl font-bold mb-4">
        Considered &amp; passed — the universe Nick screened at inception
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
        {SCREENED.map((s) => (
          <div
            key={s.ticker}
            className="flex-shrink-0 w-72 snap-start bg-white border border-[#E0D9C8] rounded-xl p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="text-lg font-bold">{s.ticker}</div>
              <span className={`${badgeClass(s.status)} rounded-full px-2 py-0.5 text-[10px] font-mono`}>
                {s.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed line-clamp-5">{s.notes}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferencesFooter() {
  return (
    <details className="mt-10 group">
      <summary className="cursor-pointer font-mono text-xs text-gray-500 tracking-widest hover:text-[#2a2a2a] transition-colors">
        THIS WEEK&apos;S REFERENCES — NONE
      </summary>
      <p className="mt-2 text-xs text-gray-500 italic">No references logged this week.</p>
    </details>
  );
}

function AboutTab() {
  return (
    <div className="pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div id="about-profile" className="lg:col-span-1 scroll-mt-6">
          <div className="bg-white border border-[#E0D9C8] rounded-xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=nick-portfolio&backgroundColor=ffd89b"
              alt="Nick avatar"
              className="w-full aspect-square rounded-xl object-cover bg-[#F5F0E8]"
            />
            <div className="text-2xl font-bold text-center mt-3">Nick</div>
            <div className="font-mono text-xs text-gray-400 text-center mt-1 tracking-wider">
              PORTFOLIO MANAGER · BLINDED
            </div>
          </div>
        </div>

        <div id="about-bio" className="lg:col-span-3 scroll-mt-6">
          <div className="bg-white border border-[#E0D9C8] rounded-xl p-6">
            <h2 className="text-2xl font-bold">Who Nick is</h2>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              Nick is the agent who runs Yim&apos;s blinded $10,000 USD paper portfolio. He&apos;s named after Nick Sleep of the Nomad Investment Partnership — a fund manager famous for owning a tiny number of businesses for very long periods, doing nothing most of the time, and writing in plain language about why.
            </p>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              Patient. Conviction over activity. Reads filings end-to-end. Writes a kill condition for every position before he buys. When he doesn&apos;t know, he says so.
            </p>
            <blockquote className="border-l-4 border-amber-400 pl-4 italic text-gray-600 my-4 bg-amber-50 py-3 rounded-r text-sm">
              &ldquo;Investing is the ownership of businesses, not the trading of tickers. Turnover is a signal of a broken process, not a working one.&rdquo;
            </blockquote>

            <h2 className="text-2xl font-bold mt-6">The blindness rule</h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              Nick does not know what Yim actually owns. The point of the experiment is to stress-test Yim&apos;s investing philosophy as an independent system. Nick reads the same knowledge base — theses, research, contradictions — but is forbidden from any file that names Yim&apos;s holdings. When Nick independently picks a stock Yim already owns, that&apos;s a strong signal. When he diverges, that&apos;s the content goldmine.
            </p>
          </div>
        </div>
      </div>

      <div id="about-mandate" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 scroll-mt-6">
        <InfoCard title="How he thinks">
          <Bullet bold="Starts with the business" rest=", not the chart. Reads filings, listens to earnings calls." />
          <Bullet bold="Distinguishes price from value." rest=" A good company at a bad price is a bad trade." />
          <Bullet bold="Prefers compounders with scale economies shared" rest=" — costs fall as scale grows." />
          <Bullet bold="Distrusts excitement." rest=" Distrusts certainty even more." />
          <Bullet bold="Sizes by conviction" rest=", not by potential upside." />
          <Bullet bold="Never predicts macro." rest=" Never claims the market is wrong." />
        </InfoCard>

        <InfoCard title="Investment mandate">
          <Bullet bold="Capital:" rest=" $10,000 USD. No deposits, no withdrawals." />
          <Bullet bold="Positions:" rest=" 3–10 individual stocks until NAV passes $50K." />
          <Bullet bold="Cash:" rest=" 0–40%. Default fully invested." />
          <Bullet bold="Geography:" rest=" any IBKR-executable listing." />
          <Bullet bold="Asset rules:" rest=" individual stocks only. No ETFs." />
          <Bullet bold="Buy-and-hold bias:" rest=" Minimum hold 6 months." />
          <Bullet bold="Benchmark:" rest=" beat SPY over rolling multi-year periods." />
        </InfoCard>

        <InfoCard title="How Nick is invoked">
          <div className="space-y-3 text-sm">
            <CommandBlock cmd="/nick-init">
              <strong>One-time portfolio seed.</strong> Nick reads the KB blocklist-filtered, screens 25–30 candidate names, narrows to 3–10, writes a thesis and 2–3 kill conditions per position.
            </CommandBlock>
            <CommandBlock cmd="/nick-weekly">
              <strong>Weekly recommendation.</strong> Nick re-prices every position via yfinance, scans new KB insights, classifies each holding intact / evolving / at-risk, and recommends buy / trim / hold / sell.
            </CommandBlock>
            <CommandBlock cmd="/nick-quarterly">
              <strong>Earnings-grade verdict.</strong> Run after earnings season with transcripts in hand. Nick reads each transcript end-to-end and stamps every holding.
            </CommandBlock>
            <CommandBlock cmd="blocklist">
              <strong>What Nick can&apos;t see.</strong> Yim&apos;s actual holdings file, the portfolio dashboards, his published video list, his diary transcripts.
            </CommandBlock>
          </div>
        </InfoCard>
      </div>

      <div id="about-blocklist" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 scroll-mt-6">
        <InfoCard title="Trading rules">
          <Bullet bold="Buy-and-hold bias." rest=" Minimum intended hold is 6 months." />
          <Bullet bold="Every trade needs a kill condition" rest=" — specific event/metric that would invalidate the thesis." />
          <Bullet bold="Execution window:" rest=" Yim places orders manually within 1 hour of US market open." />
          <Bullet bold="No stop orders." rest=" Long-term conviction, not stop-loss risk management." />
          <Bullet bold="Cadence:" rest=" weekly recommendation + quarterly earnings-grade review." />
        </InfoCard>

        <InfoCard title="What Nick reads">
          <Bullet bold="Thesis tracker" rest=" — live status of every thesis in Yim's KB." />
          <Bullet bold="Topic map" rest=" — Yim's organized index of research topics." />
          <Bullet bold="Contradiction registry" rest=" — open cross-source tensions." />
          <Bullet bold="Insights folder" rest=" — extracted atoms from Yim's reading." />
          <Bullet bold="Reese research docs" rest=" — deep-research analyst's filings-level write-ups." />
          <Bullet bold="Public market data" rest=" — yfinance for prices, web search for news." />
        </InfoCard>

        <InfoCard title="What Nick won't do">
          <Bullet bold="Will not advise Yim's real portfolio." rest=" Nick manages only the paper $10K." />
          <Bullet bold="Will not predict macro" rest=" or claim the market is wrong about a stock." />
          <Bullet bold="Will not chase hot themes." rest=" Holds cash within the 40% ceiling if no conviction-level idea exists." />
          <Bullet bold="Will not churn." rest=" Turnover is a signal of a broken process." />
          <Bullet bold="Will not fabricate data." rest=" Missing numbers are marked [unverified]." />
          <Bullet bold="Will not read the blocklist" rest=" — not even to infer what a file might say." />
        </InfoCard>
      </div>

      <footer className="border-t border-[#E0D9C8] pt-4 mt-8 flex flex-col sm:flex-row justify-between gap-2 font-mono text-xs text-gray-400">
        <span>Nick = blinded paper portfolio agent · Source of truth: Output/Nick/</span>
        <span>Dashboard built 2026-05-06</span>
      </footer>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E0D9C8] rounded-xl p-5">
      <h3 className="text-base font-bold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-700">{children}</ul>
    </div>
  );
}

function Bullet({ bold, rest }: { bold: string; rest: string }) {
  return (
    <li className="leading-relaxed">
      <strong className="text-[#2a2a2a]">{bold}</strong>
      <span className="text-gray-600">{rest}</span>
    </li>
  );
}

function CommandBlock({ cmd, children }: { cmd: string; children: React.ReactNode }) {
  return (
    <div>
      <code className="font-mono bg-gray-800 text-white px-2 py-1 rounded text-xs">{cmd}</code>
      <p className="text-xs text-gray-600 leading-relaxed mt-1.5">{children}</p>
    </div>
  );
}
