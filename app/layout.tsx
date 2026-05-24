import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { NewsOutlineProvider } from "@/lib/news-outline-context";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "Your intelligent investment research workspace",
};

const themeBootstrap = `
  (function () {
    try {
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark') t = 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen bg-app text-app antialiased">
        <ThemeProvider>
          <NewsOutlineProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </NewsOutlineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
