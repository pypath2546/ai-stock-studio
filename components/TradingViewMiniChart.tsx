"use client";

import { useEffect, useRef } from "react";

export default function TradingViewMini({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol === "SOI.PA" ? "EURONEXT:SOI" : `NASDAQ:${symbol}`,
      width: "100%",
      height: 80,
      locale: "en",
      dateRange: "1M",
      colorTheme: "light",
      trendLineColor: "rgba(74, 92, 63, 1)",
      underLineColor: "rgba(74, 92, 63, 0.1)",
      underLineBottomColor: "rgba(253, 250, 244, 0)",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={containerRef} style={{ height: 80, width: 120 }} />;
}
