import { useEffect, useMemo, useRef } from "react";
import { createChart, AreaSeries } from "lightweight-charts";

function TradingViewChart({ 
  symbol = "Stock",
  socketStatus = "idle",
  priceData = [],
  isUp = true,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const previousSymbolRef = useRef(symbol);

  const lineColor = isUp ? "#0066cc" : "#d9232a";
  const topColor = isUp ? "rgba(0, 102, 204, 0.12)" : "rgba(217, 35, 42, 0.12)";
  const bottomColor = "rgba(255,255,255,0.00)";

  const validData = useMemo(() => {
    if (!Array.isArray(priceData)) return [];
    const map = new Map();
    priceData.forEach((item) => {
      const time = Number(item?.time); 
      const value = Number(item?.value);
      if (!time || !value || Number.isNaN(time) || Number.isNaN(value)) return;
      map.set(time, { time, value });
    });
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }, [priceData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 240,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#6b7280",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#f3f4f6", style: 1 },
        horzLines: { color: "#f3f4f6", style: 1 },
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        textColor: "#9ca3af",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#9ca3af",
          width: 1,
          style: 2,
          labelVisible: true,
          labelBackgroundColor: "#1f2937",
        },
        horzLine: {
          color: "#9ca3af",
          width: 1,
          style: 2,
          labelVisible: true,
          labelBackgroundColor: "#1f2937",
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
      priceLineVisible: true,
      priceLineColor: lineColor,
      priceLineWidth: 1,
      priceLineStyle: 2,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#ffffff",
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderWidth: 2,
    });

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;

    if (validData.length > 0) {
      areaSeries.setData(validData);
      chart.timeScale().fitContent();
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    });
    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        areaSeriesRef.current = null;
      }
    };
  }, [symbol, isUp]);

  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current) return;
    if (validData.length === 0) return;
    areaSeriesRef.current.setData(validData);
    if (previousSymbolRef.current !== symbol) {
      chartRef.current.timeScale().fitContent();
      previousSymbolRef.current = symbol;
      return;
    }
    chartRef.current.timeScale().scrollToRealTime();
  }, [validData, symbol]);

  // ── Fix 3: Volume bars — seeded so they don't re-randomize on every render ──
  const volumeBars = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      height: 15 + ((i * 37 + 13) % 85),
      isGreen: i % 3 !== 0,
    }));
  }, []);

  return (
    <div className="w-full">
      {/* Main Chart */}
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: "240px" }}
      />

      {/* Volume bars — always visible below chart */}
      <div
        className="flex items-end gap-px mt-1 w-full"
        style={{ height: "36px" }}
      >
        {volumeBars.map((bar, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${bar.height}%`,
              backgroundColor: bar.isGreen ? "#16a34a" : "#dc2626",
              opacity: 0.75,
              minHeight: "3px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default TradingViewChart;
