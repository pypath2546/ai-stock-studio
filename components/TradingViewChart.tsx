"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  height?: number;
}

export default function TradingViewChart({ symbol, height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol === "SOI.PA" ? "EURONEXT:SOI" : `NASDAQ:${symbol}`,
      interval: "D",
      timezone: "Asia/Bangkok",
      theme: "light",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(253, 250, 244, 0)",
      gridColor: "rgba(224, 217, 200, 0.5)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
}
