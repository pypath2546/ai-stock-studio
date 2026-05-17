'use client'
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ExternalLink, TrendingUp, Cpu, Bot } from 'lucide-react';

interface Article {
  source: string;
  category: string;
  bg: string;
  color: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
}

interface NewsResponse {
  articles: Article[];
  fetchedAt: string;
  sources: string[];
}

function groupByDate(articles: Article[]) {
  return articles.reduce((groups, article) => {
    const date = new Date(article.publishedAt).toISOString().split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(article);
    return groups;
  }, {} as Record<string, Article[]>);
}

function toThaiDate(dateStr: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(dateStr));
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsPage() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const url = activeCategory === 'all'
        ? '/api/news'
        : `/api/news?category=${activeCategory}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const grouped = data ? groupByDate(data.articles) : {};
  const sortedDates = Object.keys(grouped).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">Tech &amp; Finance News</h1>
          <p className="text-sm font-mono text-gray-500 mt-2">
            {data ? `Updated ${timeAgo(data.fetchedAt)}` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E0D9C8] bg-white hover:bg-[#F2EDE3] disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 mb-10">
        {[
          { id: 'all', label: 'ทั้งหมด', icon: null },
          { id: 'finance', label: 'การเงิน', icon: TrendingUp },
          { id: 'tech', label: 'เทคโนโลยี', icon: Cpu },
          { id: 'ai', label: 'AI', icon: Bot },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#4a5c3f] text-white'
                  : 'border border-[#E0D9C8] text-gray-600 hover:bg-[#F2EDE3]'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#E0D9C8] p-4 flex gap-4 animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">ไม่สามารถโหลดข่าวได้</p>
          <button
            onClick={fetchNews}
            className="mt-4 px-6 py-2 bg-[#4a5c3f] text-white rounded-lg hover:bg-[#5a7a4a]"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && (
        <div className="relative border-l-2 border-dotted border-[#C8BFB0] ml-1.5">
          {sortedDates.map(date => (
            <section key={date} id={`date-${date}`} className="mb-14 pl-8">

              {/* Date marker */}
              <div className="flex items-center gap-3 mb-6 -ml-[41px]">
                <div className="w-4 h-4 rounded-full bg-[#4a5c3f] border-4 border-[#F2EDE3] shrink-0" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {toThaiDate(date)}
                  </h2>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {date} · {grouped[date].length} บทความ
                  </p>
                </div>
              </div>

              {/* Article Cards */}
              <div className="space-y-3">
                {grouped[date].map((article) => {
                  const id = article.url;
                  const expanded = expandedId === id;
                  return (
                    <article
                      key={id}
                      className="bg-white rounded-2xl border border-[#E0D9C8] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex gap-4 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : id)}
                    >
                      {/* Image or Logo */}
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt=""
                          className="w-24 h-24 rounded-xl object-cover shrink-0 bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`w-24 h-24 rounded-xl flex items-center justify-center shrink-0 ${article.bg}`}>
                          <span className={`text-xs font-semibold ${article.color} text-center leading-tight px-2`}>
                            {article.source}
                          </span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded ${article.bg} ${article.color}`}>
                            {article.source}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {timeAgo(article.publishedAt)}
                          </span>
                        </div>

                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="group block"
                        >
                          <h3 className="font-semibold text-base text-gray-900 group-hover:text-[#4a5c3f] line-clamp-2 leading-snug">
                            {article.title}
                            <ExternalLink className="inline ml-1 w-3 h-3 opacity-40 align-baseline" />
                          </h3>
                        </a>

                        {expanded && article.description && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            {article.description}
                          </p>
                        )}

                        <p className="text-xs font-mono text-gray-400 mt-2">
                          {expanded ? 'คลิกเพื่อปิด ↑' : 'คลิกเพื่ออ่านเพิ่ม ↓'}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Source footer */}
              <p className="text-xs font-mono text-gray-400 mt-4 ml-1">
                แหล่งที่มา: {[...new Set(grouped[date].map(a => a.source))].join(' · ')}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
