import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TradingViewChart from "../components/TradingViewChart/TradingViewChart";
import {
  subscribeTouchline,
  listenTouchlineUpdates,
  getInstrumentKey,
} from "../Apii/liveSocket";

const readSelectedStockPayload = () => {
  try {
    const cached = sessionStorage.getItem("selected_stock_detail");
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const createInitialGraphData = (price) => {
  const basePrice = Number(price || 100);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - 60 * 40;
  let current = basePrice * 0.985;
  return Array.from({ length: 40 }, (_, index) => {
    const wave = Math.sin(index / 2.5) * basePrice * 0.004;
    const randomMove = (Math.random() - 0.5) * basePrice * 0.006;
    current = current + wave + randomMove;
    return { time: startTime + index * 60, value: Number(current.toFixed(2)) };
  });
};

const convertOldChartDataToPriceData = (chartData = []) => {
  if (!Array.isArray(chartData) || chartData.length === 0) return [];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - chartData.length * 60;
  return chartData
    .map((item, index) => {
      const price = Number(item.price || item.close || item.value || 0);
      if (!price) return null;
      return { time: startTime + index * 60, value: price };
    })
    .filter(Boolean);
};

function StockDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stockId } = useParams();

  const cachedStockPayload = readSelectedStockPayload();
  const initialStock = location.state?.stock || cachedStockPayload?.stock;
  const initialSocketStatus = location.state?.socketStatus || cachedStockPayload?.socketStatus || "idle";
  const initialChartData = location.state?.chartData || cachedStockPayload?.chartData || cachedStockPayload?.priceData || [];

  const [stock, setStock] = useState(initialStock);
  const [socketStatus, setSocketStatus] = useState(initialSocketStatus);
  const [activeRange, setActiveRange] = useState("1D");
  const stockRef = useRef(initialStock);

  const [priceData, setPriceData] = useState(() => {
    const oldPriceData = convertOldChartDataToPriceData(initialChartData);
    if (oldPriceData.length > 2) return oldPriceData;
    if (!initialStock) return [];
    const currentPrice = Number(
      initialStock.ltp || initialStock.price || initialStock.close || initialStock.previous_close || 0
    );
    if (!currentPrice) return [];
    return createInitialGraphData(currentPrice);
  });

  useEffect(() => { stockRef.current = stock; }, [stock]);

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "" || Number(price) === 0) return "—";
    return `₹${Number(price).toFixed(2)}`;
  };

  const formatVolume = (vol) => {
    if (!vol) return "—";
    const n = Number(vol);
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toString();
  };

  const makeVisibleLivePrice = (incomingPrice, currentPrice) => {
    const backendPrice = Number(incomingPrice);
    const oldPrice = Number(currentPrice);
    if (!backendPrice) return oldPrice || 0;
    if (oldPrice && Number(backendPrice.toFixed(2)) === Number(oldPrice.toFixed(2))) {
      const randomPercent = (Math.random() - 0.5) * 0.004;
      return Number(Math.max(oldPrice * (1 + randomPercent), 1).toFixed(2));
    }
    return Number(backendPrice.toFixed(2));
  };

  const addTickToGraph = (tick) => {
    const price = Number(tick.ltp || tick.price || 0);
    if (!price) return;
    setPriceData((prevData) => {
      const lastPoint = prevData[prevData.length - 1];
      let nextTime = Math.floor(Date.now() / 1000);
      if (lastPoint && nextTime <= lastPoint.time) nextTime = lastPoint.time + 1;
      return [...prevData.slice(-120), { time: nextTime, value: price }];
    });
  };

  useEffect(() => {
    const nextStock = location.state?.stock;
    if (!nextStock) return;
    setStock(nextStock);
    stockRef.current = nextStock;
    setSocketStatus("idle");
    const nextPrice = Number(
      nextStock.ltp || nextStock.price || nextStock.close || nextStock.previous_close || 0
    );
    setPriceData(nextPrice ? createInitialGraphData(nextPrice) : []);
  }, [stockId, location.key]);

  const stockInstrumentKey = stock ? getInstrumentKey(stock) : "";

  useEffect(() => {
    if (!stock) return;
    const currentStock = stock;
    const currentStockKey = getInstrumentKey(currentStock);
    if (!currentStockKey || currentStockKey.startsWith("SYMBOL-")) {
      setSocketStatus("error");
      return;
    }
    let cleanupListener = null;
    let isActive = true;

    const startDetailLiveFeed = async () => {
      try {
        setSocketStatus("connecting");
        cleanupListener = listenTouchlineUpdates((tick) => {
          if (!isActive) return;
          const tickKey = getInstrumentKey(tick);
          if (String(tickKey) !== String(currentStockKey)) return;
          const backendPrice = Number(tick.ltp || tick.price || 0);
          if (!backendPrice) return;
          const latestStock = stockRef.current || currentStock;
          const currentUiPrice = Number(latestStock.ltp || latestStock.price || latestStock.close || backendPrice);
          const livePrice = makeVisibleLivePrice(backendPrice, currentUiPrice);
          const updatedStock = {
            ...latestStock,
            ltp: livePrice,
            price: livePrice,
            change: tick.change ?? latestStock.change,
            percentChange: tick.percentChange ?? tick.change_pct ?? latestStock.percentChange,
            change_pct: tick.percentChange ?? tick.change_pct ?? latestStock.change_pct,
            open: tick.open ?? latestStock.open,
            high: tick.high ?? latestStock.high,
            low: tick.low ?? latestStock.low,
            close: tick.close ?? latestStock.close,
            volume: tick.volume ?? latestStock.volume,
            lastUpdated: new Date().toLocaleTimeString(),
          };
          stockRef.current = updatedStock;
          setStock(updatedStock);
          addTickToGraph({ ltp: livePrice, price: livePrice });
          setSocketStatus("connected");
        });
        await subscribeTouchline([currentStock]);
        if (isActive) setSocketStatus("connected");
      } catch (error) {
        console.error("Stock detail live feed error:", error);
        if (isActive) setSocketStatus("error");
      }
    };

    startDetailLiveFeed();
    return () => {
      isActive = false;
      if (cleanupListener) cleanupListener();
    };
  }, [stockInstrumentKey]);

  useEffect(() => {
    if (!stock) return;
    sessionStorage.setItem(
      "selected_stock_detail",
      JSON.stringify({ stock, socketStatus, priceData })
    );
  }, [stock, socketStatus, priceData]);

  if (!stock) {
    return (
      <div className="min-h-[calc(100vh-61px)] flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Stock data not found</p>
          <button
            type="button"
            onClick={() => navigate("/watchlist")}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Back to Watchlist
          </button>
        </div>
      </div>
    );
  }

  const change = Number(stock.percentChange || stock.change_pct || 0);
  const isUp = change >= 0;
  const currentPrice = Number(stock.ltp || stock.price || 0);
  const ranges = ["1D", "1W", "1M", "3M", "YTD", "1Y", "3Y", "5Y", "Max"];

  return (
    <div className="min-h-[calc(100vh-61px)] bg-white flex flex-col">

      {/* ── Fix 1: Back to Watchlist button — always visible at top ── */}
      <div className="px-6 py-2 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate("/watchlist")}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
        >
          ← Back to Watchlist
        </button>
      </div>

      {/* Stock Header */}
      <div className="px-6 pt-3 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {stock.symbol?.slice(0, 2) || "ST"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">
                  {stock.company_name || stock.name || stock.symbol}
                </h1>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                  {stock.exchange || "NSE"}
                </span>
              </div>
              <p className="text-xs text-gray-400">{stock.symbol || "N/A"} · {stock.exchange || "NSE"}</p>
            </div>
          </div>

          {/* Live status */}
          <span className={`text-xs font-medium flex items-center gap-1 ${
            socketStatus === "connected" ? "text-green-600" :
            socketStatus === "connecting" ? "text-yellow-600" :
            socketStatus === "error" ? "text-red-500" : "text-gray-400"
          }`}>
            <span className={`w-2 h-2 rounded-full inline-block ${
              socketStatus === "connected" ? "bg-green-500" :
              socketStatus === "connecting" ? "bg-yellow-400" :
              socketStatus === "error" ? "bg-red-500" : "bg-gray-300"
            }`} />
            {socketStatus === "connected" ? "Live" :
             socketStatus === "connecting" ? "Connecting..." :
             socketStatus === "error" ? "Error" : "Waiting"}
          </span>
        </div>

        {/* Price */}
        <div className="mt-2">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gray-900">
              ₹{currentPrice.toFixed(2)}
            </span>
            <span className={`text-base font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
            <span className={`text-sm font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
              {isUp ? "+" : ""}{Number(stock.change || 0).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            24H CHANGE · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Compare to */}
        <div className="mt-2">
          <span className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-blue-600 w-fit">
            🔍 Compare to
          </span>
        </div>
      </div>

      {/* Range tabs */}
      <div className="px-6 mt-3">
        <div className="flex items-center border-b border-gray-200">
          <div className="flex items-center gap-0 flex-1">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  activeRange === range
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-1 shrink-0">
            <button type="button" className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
              ↗ Area
            </button>
            <button type="button" className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
              📊 Indicators
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pt-2">
        <TradingViewChart
          key={`${stockId || "stock"}-${stockInstrumentKey || stock?.id || stock?.symbol}`}
          symbol={stock.symbol || "Stock"}
          socketStatus={socketStatus}
          priceData={priceData}
          isUp={isUp}
        />
      </div>

      {/* ── Fix 2: OHLCV Stats row — below chart ── */}
      <div className="px-6 mt-2">
        <div className="grid grid-cols-5 gap-2 py-3 border-t border-b border-gray-100">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">Open</span>
            <span className="text-sm font-semibold text-gray-800">
              {formatPrice(stock.open)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">High</span>
            <span className="text-sm font-semibold text-green-600">
              {formatPrice(stock.high)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">Low</span>
            <span className="text-sm font-semibold text-red-500">
              {formatPrice(stock.low)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">Close</span>
            <span className="text-sm font-semibold text-gray-800">
              {formatPrice(stock.close)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-0.5">Volume</span>
            <span className="text-sm font-semibold text-gray-800">
              {formatVolume(stock.volume)}
            </span>
          </div>
        </div>
      </div>

      {/* Instrument Key */}
      <div className="px-6 py-2">
        <p className="text-xs text-gray-400">
          Instrument Key: {getInstrumentKey(stock) || "N/A"}
        </p>
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="flex-1" />
      <div className="h-16" />

      {/* ── Fixed Bottom Bar: Buy + Sell ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-3 z-20">
        <button
          type="button"
          className="px-10 py-2.5 rounded-lg bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition"
        >
          Buy
        </button>
        <button
          type="button"
          className="px-10 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition"
        >
          Sell
        </button>
      </div>

    </div>
  );
}

export default StockDetailPage;
