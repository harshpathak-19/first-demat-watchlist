import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TradingViewChart from "../components/TradingViewChart/TradingViewChart";
import {
  connectMarketSocket,
  subscribeTouchline,
  listenTouchlineUpdates,
  unsubscribeTouchline,
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

// Temporary UI graph data.
// Later isko real historical API se replace karna better rahega.
const createInitialGraphData = (price) => {
  const basePrice = Number(price || 100);

  const now = Math.floor(Date.now() / 1000);
  const startTime = now - 60 * 40;

  let current = basePrice * 0.985;

  return Array.from({ length: 40 }, (_, index) => {
    const wave = Math.sin(index / 2.5) * basePrice * 0.004;
    const randomMove = (Math.random() - 0.5) * basePrice * 0.006;

    current = current + wave + randomMove;

    return {
      time: startTime + index * 60,
      value: Number(current.toFixed(2)),
    };
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

      return {
        time: startTime + index * 60,
        value: price,
      };
    })
    .filter(Boolean);
};

function StockDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const cachedStockPayload = readSelectedStockPayload();

  const initialStock = location.state?.stock || cachedStockPayload?.stock;

  const initialSocketStatus =
    location.state?.socketStatus || cachedStockPayload?.socketStatus || "idle";

  const initialChartData =
    location.state?.chartData ||
    cachedStockPayload?.chartData ||
    cachedStockPayload?.priceData ||
    [];

  const [stock, setStock] = useState(initialStock);
  const [socketStatus, setSocketStatus] = useState(initialSocketStatus);

  const [priceData, setPriceData] = useState(() => {
    const oldPriceData = convertOldChartDataToPriceData(initialChartData);

    if (oldPriceData.length > 2) {
      return oldPriceData;
    }

    if (!initialStock) return [];

    const currentPrice = Number(
      initialStock.ltp ||
        initialStock.price ||
        initialStock.close ||
        initialStock.previous_close ||
        0
    );

    if (!currentPrice) return [];

    return createInitialGraphData(currentPrice);
  });

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "₹0.00";
    }

    return `₹${Number(price).toFixed(2)}`;
  };

  const addTickToGraph = (tick) => {
    const price = Number(tick.ltp || tick.price || 0);

    if (!price) return;

    setPriceData((prevData) => {
      const lastPoint = prevData[prevData.length - 1];

      let nextTime = Math.floor(Date.now() / 1000);

      if (lastPoint && nextTime <= lastPoint.time) {
        nextTime = lastPoint.time + 1;
      }

      return [
        ...prevData.slice(-120),
        {
          time: nextTime,
          value: price,
        },
      ];
    });
  };

  useEffect(() => {
    if (!stock) return;

    const stockKey = getInstrumentKey(stock);

    if (!stockKey) {
      console.warn("Stock instrument key not found:", stock);
      return;
    }

    let cleanupListener = null;

    const startLiveFeed = async () => {
      try {
        setSocketStatus("connecting");

        connectMarketSocket();

        await subscribeTouchline([stock]);

        setSocketStatus("connected");

        cleanupListener = listenTouchlineUpdates((tick) => {
          const tickKey = getInstrumentKey(tick);

          if (tickKey !== stockKey) {
            return;
          }

          const updatedStock = {
            ...stock,
            ltp: tick.ltp,
            price: tick.ltp,
            change: tick.change,
            percentChange: tick.percentChange,
            change_pct: tick.percentChange,
            open: tick.open,
            high: tick.high,
            low: tick.low,
            close: tick.close,
            volume: tick.volume,
            lastUpdated: new Date().toLocaleTimeString(),
          };

          setStock((prev) => ({
            ...prev,
            ...updatedStock,
          }));

          setSocketStatus("connected");

          addTickToGraph(tick);

          sessionStorage.setItem(
            "selected_stock_detail",
            JSON.stringify({
              stock: updatedStock,
              socketStatus: "connected",
              priceData,
            })
          );
        });
      } catch (error) {
        console.error("Stock detail WebSocket error:", error);
        setSocketStatus("error");
      }
    };

    startLiveFeed();

    return () => {
      if (cleanupListener) {
        cleanupListener();
      }

      unsubscribeTouchline([stock]);
    };
  }, [stock?.exchangeInstrumentID, stock?.ExchangeInstrumentID]);

  useEffect(() => {
    if (!stock) return;

    sessionStorage.setItem(
      "selected_stock_detail",
      JSON.stringify({
        stock,
        socketStatus,
        priceData,
      })
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
  const instrumentKey = getInstrumentKey(stock);

  return (
    <div className="min-h-[calc(100vh-61px)] bg-white px-12 py-6">
      <button
        type="button"
        onClick={() => navigate("/watchlist")}
        className="text-sm text-gray-500 hover:text-gray-900 mb-8"
      >
        ← Back to Watchlist
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10">
        {/* Left Section */}
        <div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-700">
              {stock.symbol?.slice(0, 2) || "ST"}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {stock.company_name || stock.name || stock.symbol}
              </h1>

              <p className="text-sm text-gray-400 mt-1">
                {stock.symbol || "N/A"} · {stock.exchange || "NSE"}
              </p>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-gray-900">
                {formatPrice(stock.ltp || stock.price)}
              </p>

              <p
                className={`text-lg font-semibold ${
                  isUp ? "text-green-600" : "text-red-500"
                }`}
              >
                {isUp ? "+" : ""}
                {change}%
              </p>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Instrument Key: {instrumentKey || "N/A"}
            </p>
          </div>

          <div className="mt-10">
            <TradingViewChart
              symbol={stock.symbol || "Stock"}
              socketStatus={socketStatus}
              priceData={priceData}
            />
          </div>
        </div>

        {/* Right Details Card */}
        <div className="border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Stock Details
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Current Price</span>
              <span className="text-sm font-semibold">
                {formatPrice(stock.ltp || stock.price)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Open</span>
              <span className="text-sm font-semibold">
                {stock.open ? formatPrice(stock.open) : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">High</span>
              <span className="text-sm font-semibold text-green-600">
                {stock.high ? formatPrice(stock.high) : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Low</span>
              <span className="text-sm font-semibold text-red-500">
                {stock.low ? formatPrice(stock.low) : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Close</span>
              <span className="text-sm font-semibold">
                {stock.close ? formatPrice(stock.close) : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Volume</span>
              <span className="text-sm font-semibold">
                {stock.volume || "—"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Live Status</span>
              <span
                className={`text-sm font-semibold ${
                  socketStatus === "connected"
                    ? "text-green-600"
                    : socketStatus === "error"
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {socketStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              type="button"
              className="py-3 rounded-xl bg-green-500 text-white font-semibold"
            >
              Buy
            </button>

            <button
              type="button"
              className="py-3 rounded-xl bg-red-500 text-white font-semibold"
            >
              Sell
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockDetailPage;