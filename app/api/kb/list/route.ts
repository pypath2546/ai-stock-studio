import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
import { NextResponse } from 'next/server';

export async function GET() {
  const kb: unknown[] = await kv.get('knowledge_base') || [];
  return NextResponse.json({ entries: kb });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const kb: { id: string }[] = await kv.get('knowledge_base') || [];
  const updated = kb.filter(e => e.id !== id);
  await kv.set('knowledge_base', updated);
  return NextResponse.json({ success: true });
}
