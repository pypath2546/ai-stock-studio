import Link from "next/link";
import { BookOpen, Newspaper } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-3">
        Welcome
      </p>
      <h1 className="font-semibold text-5xl text-[#2a2a2a] leading-tight tracking-tight">
        AI Studio
      </h1>
      <p className="mt-4 text-lg text-[#555] max-w-xl">
        Your intelligent investment research workspace
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-10">
        <Link
          href="/diary"
          className="group block rounded-2xl border border-[#E0D9C8] bg-[#FDFAF4] p-6 hover:border-[#4a5c3f] transition-colors"
        >
          <BookOpen className="h-5 w-5 text-[#4a5c3f] mb-3" />
          <p className="font-semibold text-[#2a2a2a]">Diary</p>
          <p className="text-sm text-[#888] mt-1">
            Write and review your investment journal.
          </p>
        </Link>
        <Link
          href="/news"
          className="group block rounded-2xl border border-[#E0D9C8] bg-[#FDFAF4] p-6 hover:border-[#4a5c3f] transition-colors"
        >
          <Newspaper className="h-5 w-5 text-[#4a5c3f] mb-3" />
          <p className="font-semibold text-[#2a2a2a]">News</p>
          <p className="text-sm text-[#888] mt-1">
            Today&apos;s market headlines, curated.
          </p>
        </Link>
      </div>
    </div>
  );
}
