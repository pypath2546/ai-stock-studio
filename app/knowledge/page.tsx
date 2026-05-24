'use client';

import { useState, useEffect, useCallback } from 'react';
import { Video, Globe, FileText, Search, Trash2, Brain } from 'lucide-react';

interface KBEntry {
  id: string;
  type: 'youtube' | 'web' | 'manual';
  url: string | null;
  title: string;
  summary: string;
  tickers: string[];
  addedAt: string;
}

type TabType = 'youtube' | 'web' | 'manual';
type LoadingStep = 'idle' | 'extracting' | 'summarizing' | 'indexing' | 'done';

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: '',
  extracting: 'Extracting content…',
  summarizing: 'Summarizing with Claude…',
  indexing: 'Indexing to Knowledge Base…',
  done: 'Done!',
};

export default function KnowledgePage() {
  const [tab, setTab] = useState<TabType>('youtube');
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [error, setError] = useState('');

  // Form fields
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/kb/list');
    const data = await res.json();
    setEntries(data.entries || []);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addKnowledge = async (type: TabType) => {
    setError('');
    setLoadingStep('extracting');

    const body: Record<string, string> = { type };
    if (type === 'youtube') { body.url = ytUrl; body.title = ytTitle; }
    if (type === 'web') { body.url = webUrl; }
    if (type === 'manual') { body.title = manualTitle; body.content = manualText; }

    try {
      setLoadingStep('summarizing');
      const res = await fetch('/api/kb/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setLoadingStep('indexing');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add knowledge');
        setLoadingStep('idle');
        return;
      }

      setLoadingStep('done');
      setTimeout(() => setLoadingStep('idle'), 1500);

      // Reset form
      setYtUrl(''); setYtTitle('');
      setWebUrl('');
      setManualTitle(''); setManualText('');

      fetchEntries();
    } catch {
      setError('Network error. Please try again.');
      setLoadingStep('idle');
    }
  };

  const deleteEntry = async (id: string) => {
    await fetch('/api/kb/list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchEntries();
  };

  const filtered = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      e.tickers?.some(t => t.toLowerCase().includes(q))
    );
  });

  const tickerCount = new Set(entries.flatMap(e => e.tickers || [])).size;
  const isLoading = loadingStep !== 'idle' && loadingStep !== 'done';

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[900px] mx-auto">

      {/* Header */}
      <header className="mb-8">
        <p className="text-sm font-mono text-gray-400 tracking-widest uppercase mb-1">
          AI STOCK STUDIO
        </p>
        <h1 className="text-4xl font-bold text-white">
          Knowledge <span className="italic text-amber-600">Base.</span>
        </h1>
        <p className="text-sm text-gray-400 mt-2 font-mono">
          {entries.length} sources · {tickerCount} stocks covered
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Yim&apos;s research library — agents learn from this
        </p>
      </header>

      {/* Add Knowledge Form */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
        <h2 className="font-bold text-base mb-4">Add Knowledge</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['youtube', 'web', 'manual'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-gold text-black'
                  : 'border border-[#2A2A2A] text-gray-300 hover:bg-[#1A1A1A]'
              }`}
            >
              {t === 'youtube' && <Video className="w-3.5 h-3.5" />}
              {t === 'web' && <Globe className="w-3.5 h-3.5" />}
              {t === 'manual' && <FileText className="w-3.5 h-3.5" />}
              {t === 'youtube' ? 'YouTube' : t === 'web' ? 'Web Article' : 'Manual Text'}
            </button>
          ))}
        </div>

        {/* YouTube tab */}
        {tab === 'youtube' && (
          <div className="space-y-3">
            <input
              value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full border border-[#2A2A2A] rounded-xl px-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold"
            />
            <input
              value={ytTitle}
              onChange={e => setYtTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full border border-[#2A2A2A] rounded-xl px-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold"
            />
            <button
              onClick={() => addKnowledge('youtube')}
              disabled={isLoading || !ytUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black rounded-xl hover:bg-[#F0B800] disabled:opacity-50 transition-all text-sm font-medium"
            >
              <Video className="w-4 h-4" />
              Extract &amp; Add to KB
            </button>
          </div>
        )}

        {/* Web Article tab */}
        {tab === 'web' && (
          <div className="space-y-3">
            <input
              value={webUrl}
              onChange={e => setWebUrl(e.target.value)}
              placeholder="https://techcrunch.com/..."
              className="w-full border border-[#2A2A2A] rounded-xl px-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold"
            />
            <button
              onClick={() => addKnowledge('web')}
              disabled={isLoading || !webUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black rounded-xl hover:bg-[#F0B800] disabled:opacity-50 transition-all text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              Scrape &amp; Add to KB
            </button>
          </div>
        )}

        {/* Manual tab */}
        {tab === 'manual' && (
          <div className="space-y-3">
            <input
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
              placeholder="Title"
              className="w-full border border-[#2A2A2A] rounded-xl px-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold"
            />
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder="Paste article text, earnings call transcript, research notes..."
              rows={6}
              className="w-full border border-[#2A2A2A] rounded-xl px-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold resize-none"
            />
            <button
              onClick={() => addKnowledge('manual')}
              disabled={isLoading || !manualText}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black rounded-xl hover:bg-[#F0B800] disabled:opacity-50 transition-all text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Add to KB
            </button>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || loadingStep === 'done') && (
          <div className="mt-4 border border-[#2A2A2A] rounded-xl p-4 bg-[#1A1A1A]">
            <div className="flex items-center gap-3">
              <Brain className={`w-5 h-5 text-amber-600 ${isLoading ? 'animate-pulse' : ''}`} />
              <div>
                <p className="text-sm font-medium text-white">
                  {loadingStep === 'done' ? 'Added to Knowledge Base!' : 'Nick is reading and summarizing…'}
                </p>
                <div className="flex gap-3 mt-2">
                  {(['extracting', 'summarizing', 'indexing'] as LoadingStep[]).map((step, i) => {
                    const steps: LoadingStep[] = ['extracting', 'summarizing', 'indexing'];
                    const currentIdx = steps.indexOf(loadingStep as LoadingStep);
                    const stepIdx = i;
                    const isDone = loadingStep === 'done' || stepIdx < currentIdx;
                    const isActive = stepIdx === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          isDone ? 'bg-emerald-400' : isActive ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'
                        }`} />
                        <span className={`text-xs font-mono ${
                          isDone ? 'text-emerald-600' : isActive ? 'text-amber-600' : 'text-gray-400'
                        }`}>
                          {STEP_LABELS[step].replace('…', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-500 font-mono">{error}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by ticker or keyword…"
          className="w-full border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3 bg-[#111111] text-sm focus:outline-none focus:border-gold"
        />
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">
            {entries.length === 0 ? 'No knowledge yet' : 'No results found'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {entries.length === 0 ? 'Add YouTube videos or articles above' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(entry => (
            <KBEntryCard key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))}
        </div>
      )}
    </div>
  );
}

function KBEntryCard({
  entry,
  onDelete,
}: {
  entry: KBEntry;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {entry.type === 'youtube' && <Video className="w-4 h-4 text-red-500 shrink-0" />}
          {entry.type === 'web' && <Globe className="w-4 h-4 text-blue-500 shrink-0" />}
          {entry.type === 'manual' && <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
          <span className="font-bold text-sm truncate">{entry.title}</span>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-2"
          aria-label="Delete entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {entry.tickers && entry.tickers.length > 0 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {entry.tickers.map(t => (
            <span
              key={t}
              className="bg-[#1F1F00] text-gray-300 text-xs font-mono px-2 py-0.5 rounded"
            >
              ${t}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
        {entry.summary}
      </p>

      <div className="flex items-center justify-between mt-3 text-xs font-mono text-gray-400">
        <span>{new Date(entry.addedAt).toLocaleDateString('th-TH')}</span>
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 underline"
          >
            View source →
          </a>
        )}
      </div>
    </div>
  );
}
