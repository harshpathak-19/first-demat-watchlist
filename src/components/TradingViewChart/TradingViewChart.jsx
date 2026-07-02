import { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries } from "lightweight-charts";

function TradingViewChart({
  symbol = "Stock",
  socketStatus = "idle",
  priceData = [],
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);

  const [activeRange, setActiveRange] = useState("1D");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      height: 430,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "#e5e7eb",
          width: 1,
          style: 0,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#f97316",
      topColor: "rgba(249, 115, 22, 0.10)",
      bottomColor: "rgba(249, 115, 22, 0.00)",
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: "#ffffff",
      crosshairMarkerBackgroundColor: "#f97316",
    });

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;

    const handleResize = () => {
      if (!chartContainerRef.current) return;

      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current) return;

    const validData = priceData
      .filter((item) => item.time && item.value)
      .map((item) => ({
        time: item.time,
        value: Number(item.value),
      }));

    if (validData.length === 0) return;

    areaSeriesRef.current.setData(validData);
    chartRef.current.timeScale().fitContent();
  }, [priceData]);

  const ranges = ["1D", "1W", "1M", "6M", "1Y", "3Y", "5Y", "All"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {symbol} price chart
          </h2>

          <p className="text-xs text-gray-400 mt-1">Live price movement</p>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            socketStatus === "connected"
              ? "bg-green-50 text-green-600"
              : socketStatus === "connecting"
              ? "bg-yellow-50 text-yellow-600"
              : socketStatus === "error"
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {socketStatus === "connected"
            ? "Live Connected"
            : socketStatus === "connecting"
            ? "Connecting"
            : socketStatus === "error"
            ? "Live Error"
            : "Waiting"}
        </span>
      </div>

      <div ref={chartContainerRef} className="w-full h-[430px]" />

      <div className="flex items-center justify-center gap-3 mt-5">
        {ranges.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setActiveRange(range)}
            className={`px-4 py-2 rounded-full text-xs font-medium border transition ${
              activeRange === range
                ? "border-gray-900 text-gray-900 bg-gray-50"
                : "border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TradingViewChart;