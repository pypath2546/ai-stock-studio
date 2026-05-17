import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache 1 hour

const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: ['media:content', 'media:thumbnail']
  }
});

const FEEDS = [
  // Finance & Stocks
  {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    category: 'finance',
    bg: 'bg-purple-50',
    color: 'text-purple-700'
  },
  {
    name: 'MarketWatch',
    url: 'https://feeds.marketwatch.com/marketwatch/topstories',
    category: 'finance',
    bg: 'bg-green-50',
    color: 'text-green-700'
  },
  {
    name: 'Seeking Alpha',
    url: 'https://seekingalpha.com/feed.xml',
    category: 'finance',
    bg: 'bg-blue-50',
    color: 'text-blue-700'
  },
  {
    name: 'Investopedia',
    url: 'https://www.investopedia.com/feedbuilder/feed/getfeed/?feedName=rss_headline',
    category: 'finance',
    bg: 'bg-teal-50',
    color: 'text-teal-700'
  },

  // Tech & AI
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'tech',
    bg: 'bg-green-50',
    color: 'text-green-700'
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'tech',
    bg: 'bg-purple-50',
    color: 'text-purple-700'
  },
  {
    name: 'VentureBeat',
    url: 'https://venturebeat.com/feed/',
    category: 'ai',
    bg: 'bg-indigo-50',
    color: 'text-indigo-700'
  },
  {
    name: 'MIT Tech Review',
    url: 'https://www.technologyreview.com/feed/',
    category: 'ai',
    bg: 'bg-blue-50',
    color: 'text-blue-700'
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'tech',
    bg: 'bg-red-50',
    color: 'text-red-700'
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'tech',
    bg: 'bg-orange-50',
    color: 'text-orange-700'
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // 'finance' | 'tech' | 'ai' | null = all

  const filteredFeeds = category
    ? FEEDS.filter(f => f.category === category)
    : FEEDS;

  const results = await Promise.allSettled(
    filteredFeeds.map(async (feed) => {
      try {
        const data = await parser.parseURL(feed.url);
        return data.items
          .slice(0, 5)
          .filter(item => item.title && item.link)
          .map(item => ({
            source: feed.name,
            category: feed.category,
            bg: feed.bg,
            color: feed.color,
            title: item.title?.trim() || '',
            description: (item.contentSnippet || item.summary || '').slice(0, 400).trim(),
            url: item.link || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            imageUrl: (item as any)['media:content']?.$.url || null,
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          }));
      } catch (err) {
        console.error(`Failed: ${feed.name}`, err);
        return [];
      }
    })
  );

  const articles = results
    .filter(r => r.status === 'fulfilled')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap(r => (r as PromiseFulfilledResult<any[]>).value)
    .filter(a => a.title && !a.title.includes('[Removed]'))
    .sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 40);

  return NextResponse.json({
    articles,
    fetchedAt: new Date().toISOString(),
    sources: filteredFeeds.map(f => f.name),
  });
}
