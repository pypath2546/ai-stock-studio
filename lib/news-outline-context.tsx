"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OutlineItem = { href: string; label: string };

type Ctx = {
  items: OutlineItem[] | null;
  setItems: (items: OutlineItem[] | null) => void;
};

const NewsOutlineContext = createContext<Ctx | null>(null);

export function NewsOutlineProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OutlineItem[] | null>(null);
  const value = useMemo(() => ({ items, setItems }), [items]);
  return (
    <NewsOutlineContext.Provider value={value}>
      {children}
    </NewsOutlineContext.Provider>
  );
}

export function useNewsOutline() {
  const ctx = useContext(NewsOutlineContext);
  if (!ctx) {
    return { items: null, setItems: () => {} } satisfies Ctx;
  }
  return ctx;
}
