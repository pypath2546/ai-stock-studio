import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { NewsOutlineProvider } from "@/lib/news-outline-context";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "Your intelligent investment research workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0A] text-white antialiased">
        <NewsOutlineProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </NewsOutlineProvider>
      </body>
    </html>
  );
}
