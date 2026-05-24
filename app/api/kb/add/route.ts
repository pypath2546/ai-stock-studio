import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { KB_TICKERS as TICKERS } from '@/lib/tickers';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function summarize(text: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return text.slice(0, 500);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const summary = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Summarize this content for an investment research knowledge base.
Focus on: companies mentioned, financial data, market trends, investment thesis.
Be concise but preserve key facts and numbers.

Content: ${text.slice(0, 8000)}`,
    }],
  });
  return summary.content[0].type === 'text' ? summary.content[0].text : '';
}

export async function POST(request: Request) {
  try {
    const { type, url, title, content } = await request.json();

    let text = content as string | undefined;

    if (type === 'youtube') {
      const videoId = url?.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
      if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

      const { YoutubeTranscript } = await import('youtube-transcript');
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      text = transcript.map((t: { text: string }) => t.text).join(' ');
    }

    if (type === 'web') {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const { load } = await import('cheerio');
      const $ = load(html);
      $('script, style, nav, footer, header, aside').remove();
      text = $('article, main, .content, body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);
    }

    if (!text || text.length < 100) {
      return NextResponse.json({ error: 'Could not extract content' }, { status: 400 });
    }

    const summaryText = type === 'manual' ? text.slice(0, 500) : await summarize(text);

    const tickerMatch = text.match(new RegExp(`\\b(${TICKERS.join('|')})\\b`, 'g'));
    const tickers = [...new Set(tickerMatch || [])];

    const kbEntry = {
      id: `kb_${Date.now()}`,
      type,
      url: url || null,
      title: title || url || 'Untitled',
      summary: summaryText,
      fullText: text.slice(0, 5000),
      tickers,
      addedAt: new Date().toISOString(),
      usedByAgents: [] as string[],
    };

    const kb: typeof kbEntry[] = await kv.get('knowledge_base') || [];
    kb.unshift(kbEntry);
    await kv.set('knowledge_base', kb.slice(0, 100));

    return NextResponse.json({ success: true, entry: kbEntry });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
