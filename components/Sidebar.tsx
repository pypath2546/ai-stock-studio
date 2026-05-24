"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Newspaper,
  Sparkles,
  ChevronsLeft,
  AtSign,
  Globe,
  Mail,
  Brain,
  TrendingUp,
  Sun,
  Moon,
} from "lucide-react";
import { useNewsOutline } from "@/lib/news-outline-context";
import { useTheme } from "@/components/ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/diary", label: "Diary", icon: BookOpen },
  { href: "/trading", label: "Trading", icon: TrendingUp },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
] as const;

const PAGE_OUTLINES: Record<string, { href: string; label: string }[]> = {};

export default function Sidebar() {
  const pathname = usePathname();
  const { items: newsOutline } = useNewsOutline();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 border-r border-[#2A2A2A] bg-[#0A0A0A] flex flex-col">
      <div className="px-4 py-5 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gold flex-shrink-0 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-black" />
        </div>
        <span className="font-bold text-lg text-white leading-none tracking-tight">
          AI Studio
        </span>
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="ml-auto text-[#888] hover:text-white text-lg leading-none"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="px-3 mt-2">
        <p className="px-3 mb-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Pages
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    active
                      ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-gold text-black text-sm font-medium"
                      : "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-[#1F1F00] hover:text-white text-sm transition-colors"
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {(() => {
        const dynamicOutline =
          (pathname === "/news" || pathname === "/diary" || pathname === "/ai") && newsOutline
            ? newsOutline
            : null;
        const staticOutline = pathname ? PAGE_OUTLINES[pathname] : undefined;
        const outline = dynamicOutline ?? staticOutline ?? null;
        if (!outline || outline.length === 0) return null;
        return (
          <div className="px-3 mt-6 overflow-y-auto">
            <p className="px-3 mb-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
              On this page
            </p>
            <ul className="space-y-0.5">
              {outline.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="block px-3 py-1.5 rounded-md text-xs text-gray-300 hover:bg-[#1F1F00] hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="mt-auto px-4 pb-5 pt-4 space-y-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A1A00] transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-gold" />
              <span className="text-sm text-gray-300">Light mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-gold" />
              <span className="text-sm text-gray-300">Dark mode</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="w-full bg-gold hover:bg-gold-hover text-black text-sm font-semibold rounded-full py-2 transition-colors"
        >
          Join membership
        </button>

        <div className="flex items-center justify-center gap-3 text-[#888]">
          <a href="#" aria-label="Twitter / X" className="hover:text-white transition-colors">
            <AtSign className="h-4 w-4" />
          </a>
          <a href="#" aria-label="Website" className="hover:text-white transition-colors">
            <Globe className="h-4 w-4" />
          </a>
          <a href="#" aria-label="Email" className="hover:text-white transition-colors">
            <Mail className="h-4 w-4" />
          </a>
        </div>

        <p className="text-center font-mono text-[10px] text-gray-400">© 2026 · AI Studio</p>
      </div>
    </aside>
  );
}
