import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentStatus = 'idle' | 'running' | 'done';

export interface TopPick {
  ticker: string;
  score: number;
  price: number | undefined;
  rsi: number;
  signal: 'BUY' | 'SELL' | 'WATCH' | 'HOLD';
  vsSMA: string | undefined;
  volume: string;
  entryZone: string;
  reason: string;
}

export interface AnalysisResult {
  ticker: string;
  recommendation: string;
  confidence: number;
  currentPrice: number | null | undefined;
  signals: {
    technical?: string;
    sentiment?: string;
    quality?: string;
  };
  technical: {
    rsi?: number;
    signal?: string;
    reason?: string;
  };
  news: {
    articles?: number;
    sentiment?: string;
    score?: number;
  };
  quality: {
    approved?: boolean;
    passed?: string;
  };
  topPicks?: TopPick[];
  universeScanned?: number;
  timestamp?: string;
}

interface AnalysisStore {
  result: AnalysisResult | null;
  agentStatuses: Record<string, AgentStatus>;
  selectedTicker: string;
  setResult: (result: AnalysisResult | ((prev: AnalysisResult | null) => AnalysisResult | null)) => void;
  setAgentStatuses: (
    statuses:
      | Record<string, AgentStatus>
      | ((prev: Record<string, AgentStatus>) => Record<string, AgentStatus>),
  ) => void;
  setSelectedTicker: (ticker: string) => void;
  clearResult: () => void;
}

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set) => ({
      result: null,
      agentStatuses: {},
      selectedTicker: 'NVDA',
      setResult: (result) =>
        set((state) => {
          const next = typeof result === 'function' ? result(state.result) : result;
          if (next == null) return { result: null };
          return { result: { ...next, timestamp: next.timestamp ?? new Date().toISOString() } };
        }),
      setAgentStatuses: (statuses) =>
        set((state) => ({
          agentStatuses:
            typeof statuses === 'function' ? statuses(state.agentStatuses) : statuses,
        })),
      setSelectedTicker: (selectedTicker) => set({ selectedTicker }),
      clearResult: () => set({ result: null, agentStatuses: {} }),
    }),
    {
      name: 'analysis-storage',
      partialize: (state) => ({
        result: state.result,
        selectedTicker: state.selectedTicker,
      }),
    },
  ),
);
