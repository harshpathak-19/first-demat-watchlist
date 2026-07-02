import { useEffect, useRef, useState } from "react";
import Watchlist from "../components/Watchlist/watchlist";
import { getAllStocks, searchStocks } from "../Apii/stockApi";
import {
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  getWatchlistStocks,
  addToWatchlist,
  removeFromWatchlist,
} from "../Apii/watchlist";
import {
  connectMarketSocket,
  subscribeTouchline,
  unsubscribeTouchline,
  listenTouchlineUpdates,
  buildInstruments,
  getInstrumentKey,
} from "../Apii/liveSocket";

const CACHE_KEYS = {
  WATCHLISTS: "watchlists_cache",
  SELECTED_WATCHLIST: "selected_watchlist_cache",
  WATCHLIST_STOCKS: "watchlist_stocks_cache",
  WATCHLIST_STOCK_CACHE: "watchlist_stock_cache_map",
};

const readCache = (key, fallback) => {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore cache error
  }
};

const removeCache = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore cache error
  }
};

function WatchlistPage() {
  const ENABLE_LIVE_SOCKET = import.meta.env.VITE_ENABLE_LIVE_SOCKET === "true";
  const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_BASE_URL;
  const SUBSCRIPTION_BASE_URL = import.meta.env.VITE_SUBSCRIPTION_BASE_URL;

  const ENABLE_DUMMY_PRICES = !SOCKET_BASE_URL;

  const [stocks, setStocks] = useState([]);
  const [watchlists, setWatchlists] = useState(() =>
    readCache(CACHE_KEYS.WATCHLISTS, [])
  );
  const [selectedWatchlist, setSelectedWatchlist] = useState(() =>
    readCache(CACHE_KEYS.SELECTED_WATCHLIST, null)
  );
  const [watchlistStocks, setWatchlistStocks] = useState(() =>
    readCache(CACHE_KEYS.WATCHLIST_STOCKS, [])
  );
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [loading, setLoading] = useState(() => {
    const cachedStocks = readCache(CACHE_KEYS.WATCHLIST_STOCKS, []);
    return cachedStocks.length === 0;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState("idle");
  const [chartDataByStock, setChartDataByStock] = useState({});
  const [watchlistStockCache, setWatchlistStockCache] = useState(() =>
    readCache(CACHE_KEYS.WATCHLIST_STOCK_CACHE, {})
  );

  const latestRequestId = useRef(0);
  const selectedWatchlistRef = useRef(null);

  useEffect(() => {
    selectedWatchlistRef.current = selectedWatchlist;
  }, [selectedWatchlist]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getId = (item) => {
    return item?.id || item?.watchlist_id || item?.uuid;
  };

  const getStockId = (item) => {
    return item?.stock_id || item?.id || item?.uuid;
  };

  const normalizeName = (name) => {
    return name?.trim().toLowerCase();
  };

  const normalizeStocks = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => item.stock || item);
  };

  const saveSelectedWatchlist = (watchlist) => {
    setSelectedWatchlist(watchlist);

    if (watchlist) {
      writeCache(CACHE_KEYS.SELECTED_WATCHLIST, watchlist);
    } else {
      removeCache(CACHE_KEYS.SELECTED_WATCHLIST);
    }
  };

  const saveCurrentWatchlistStocks = (watchlistId, stockList) => {
    const finalList = Array.isArray(stockList) ? stockList : [];

    setWatchlistStocks(finalList);
    writeCache(CACHE_KEYS.WATCHLIST_STOCKS, finalList);

    if (watchlistId) {
      setWatchlistStockCache((prev) => {
        const updatedCache = {
          ...prev,
          [watchlistId]: finalList,
        };

        writeCache(CACHE_KEYS.WATCHLIST_STOCK_CACHE, updatedCache);
        return updatedCache;
      });
    }
  };

  const instrumentsKey = buildInstruments(watchlistStocks)
    .map((item) => `${item.exchangeSegment}-${item.exchangeInstrumentID}`)
    .join(",");

  // ─── Load watchlists ───────────────────────────────────────────────────────

  const loadWatchlists = async () => {
    const data = await getWatchlists();
    const list = Array.isArray(data) ? data : [];

    setWatchlists(list);
    writeCache(CACHE_KEYS.WATCHLISTS, list);

    return list;
  };

  const loadWatchlistStocks = async (watchlist, options = {}) => {
    const { forceRefresh = false } = options;

    if (!watchlist) return;

    const id = getId(watchlist);

    if (!id) {
      console.error("Watchlist ID not found:", watchlist);
      return;
    }

    saveSelectedWatchlist(watchlist);

    if (!forceRefresh && watchlistStockCache[id]) {
      saveCurrentWatchlistStocks(id, watchlistStockCache[id]);
      return;
    }

    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;

    try {
      const savedStocks = await getWatchlistStocks(id);
      const normalizedStocks = normalizeStocks(savedStocks);

      if (latestRequestId.current !== requestId) {
        return;
      }

      saveCurrentWatchlistStocks(id, normalizedStocks);
    } catch (error) {
      console.error("Error loading watchlist stocks:", error);
      alert(error.message || "Failed to load watchlist stocks");
    }
  };

  // ─── Initial data load ─────────────────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      try {
        const hasCachedStocks =
          readCache(CACHE_KEYS.WATCHLIST_STOCKS, []).length > 0;

        if (!hasCachedStocks) {
          setLoading(true);
        }

        setError("");

        const allStocks = await getAllStocks();
        setStocks(Array.isArray(allStocks) ? allStocks : []);

        let userWatchlists = await loadWatchlists();

        if (!userWatchlists || userWatchlists.length === 0) {
          const defaultWatchlist = await createWatchlist("My Watchlist");
          userWatchlists = await loadWatchlists();

          const firstWatchlist = userWatchlists[0] || defaultWatchlist;

          await loadWatchlistStocks(firstWatchlist, { forceRefresh: true });

          return;
        }

        const cachedSelectedWatchlist = readCache(
          CACHE_KEYS.SELECTED_WATCHLIST,
          null
        );

        const selectedId = getId(cachedSelectedWatchlist);

        const watchlistToOpen =
          userWatchlists.find(
            (item) => String(getId(item)) === String(selectedId)
          ) || userWatchlists[0];

        await loadWatchlistStocks(watchlistToOpen, { forceRefresh: true });
      } catch (error) {
        console.error("Error loading watchlist page:", error);
        setError(error.message || "Failed to load watchlist");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ─── WebSocket integration ─────────────────────────────────────────────────

  useEffect(() => {
    if (!ENABLE_LIVE_SOCKET) {
      console.log("Live WebSocket is disabled");
      setSocketStatus("idle");
      return;
    }

    if (!SOCKET_BASE_URL || !SUBSCRIPTION_BASE_URL) {
      console.log(
        "Live WebSocket is ready, waiting for backend URL or subscription API"
      );
      setSocketStatus("idle");
      return;
    }

    if (!instrumentsKey) {
      console.log("No valid instruments found for WebSocket subscription");
      setSocketStatus("idle");
      return;
    }

    let cleanupListener = null;

    const subscribedStocks = [...watchlistStocks];

    const subscribedInstrumentKeys = new Set(
      subscribedStocks.map((stock) => getInstrumentKey(stock)).filter(Boolean)
    );

    const startWebSocket = async () => {
      try {
        console.log("Starting WebSocket for instruments:", instrumentsKey);
        setSocketStatus("connecting");

        connectMarketSocket();

        await subscribeTouchline(subscribedStocks);

        setSocketStatus("connected");

        cleanupListener = listenTouchlineUpdates((tick) => {
          console.log("Live tick in watchlistPage:", tick);

          const tickKey = getInstrumentKey(tick);

          if (!tickKey) {
            console.warn("Tick instrument key not found:", tick);
            return;
          }

          if (!subscribedInstrumentKeys.has(tickKey)) {
            return;
          }

          setWatchlistStocks((prevStocks) => {
            const updatedStocks = prevStocks.map((stock) => {
              const stockKey = getInstrumentKey(stock);

              if (stockKey !== tickKey) {
                return stock;
              }

              return {
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
            });

            writeCache(CACHE_KEYS.WATCHLIST_STOCKS, updatedStocks);

            const currentWatchlist = selectedWatchlistRef.current;
            const watchlistId = getId(currentWatchlist);

            if (watchlistId) {
              setWatchlistStockCache((prev) => {
                const updatedCache = {
                  ...prev,
                  [watchlistId]: updatedStocks,
                };

                writeCache(CACHE_KEYS.WATCHLIST_STOCK_CACHE, updatedCache);
                return updatedCache;
              });
            }

            return updatedStocks;
          });

          setChartDataByStock((prev) => {
            const oldData = prev[tickKey] || [];

            const newPoint = {
              time: new Date().toLocaleTimeString(),
              price: tick.ltp,
            };

            return {
              ...prev,
              [tickKey]: [...oldData.slice(-50), newPoint],
            };
          });
        });
      } catch (error) {
        console.error("WebSocket start error:", error);
        setSocketStatus("error");
      }
    };

    startWebSocket();

    return () => {
      if (cleanupListener) {
        cleanupListener();
      }
    
    };
  }, [
    ENABLE_LIVE_SOCKET,
    SOCKET_BASE_URL,
    SUBSCRIPTION_BASE_URL,
    instrumentsKey,
  ]);

  // ─── Dummy live price movement for testing ─────────────────────────────────

  useEffect(() => {
    if (!ENABLE_DUMMY_PRICES) return;

    if (socketStatus === "connected") return;

    if (!watchlistStocks.length) return;

    console.log("Dummy live price");

    const intervalId = setInterval(() => {
      setWatchlistStocks((prevStocks) => {
        if (!prevStocks.length) return prevStocks;

        const updatedStocks = prevStocks.map((stock) => {
          const currentPrice = Number(
            stock.ltp ||
              stock.price ||
              stock.last_price ||
              stock.close ||
              stock.previous_close ||
              100
          );

          const randomPercent = (Math.random() - 0.5) * 0.02;

          const newPrice = Number(
            Math.max(currentPrice * (1 + randomPercent), 1).toFixed(2)
          );

          const change = Number((newPrice - currentPrice).toFixed(2));

          const percentChange = Number(
            ((change / currentPrice) * 100).toFixed(2)
          );

          return {
            ...stock,
            ltp: newPrice,
            price: newPrice,
            change,
            percentChange,
            change_pct: percentChange,
            lastUpdated: new Date().toLocaleTimeString(),
          };
        });

        writeCache(CACHE_KEYS.WATCHLIST_STOCKS, updatedStocks);

        const currentWatchlist = selectedWatchlistRef.current;
        const watchlistId = getId(currentWatchlist);

        if (watchlistId) {
          setWatchlistStockCache((prev) => {
            const updatedCache = {
              ...prev,
              [watchlistId]: updatedStocks,
            };

            writeCache(CACHE_KEYS.WATCHLIST_STOCK_CACHE, updatedCache);
            return updatedCache;
          });
        }

        return updatedStocks;
      });
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [ENABLE_DUMMY_PRICES, socketStatus, watchlistStocks.length]);

  // ─── Watchlist CRUD handlers ───────────────────────────────────────────────

  const handleCreateWatchlist = async () => {
    const name = newWatchlistName.trim();

    if (!name) {
      alert("Please enter watchlist name");
      return;
    }

    const alreadyExists = watchlists.some(
      (item) => normalizeName(item.name) === normalizeName(name)
    );

    if (alreadyExists) {
      alert(`${name} watchlist already exists`);
      return;
    }

    try {
      setSaving(true);

      await createWatchlist(name);

      setNewWatchlistName("");

      const updatedWatchlists = await loadWatchlists();

      const createdWatchlist =
        updatedWatchlists.find(
          (item) => normalizeName(item.name) === normalizeName(name)
        ) || updatedWatchlists[updatedWatchlists.length - 1];

      if (createdWatchlist) {
        await loadWatchlistStocks(createdWatchlist, { forceRefresh: true });
      }
    } catch (error) {
      console.error("Error creating watchlist:", error);
      alert(error.message || "Failed to create watchlist");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWatchlist = async (watchlist) => {
    const id = getId(watchlist);

    if (!id) {
      alert("Watchlist ID not found");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${watchlist.name}"?`
    );

    if (!confirmDelete) return;

    try {
      setSaving(true);

      const stocksToUnsubscribe = watchlistStockCache[id] || [];

      if (stocksToUnsubscribe.length > 0) {
        try {
          await unsubscribeTouchline(stocksToUnsubscribe);
          console.log("Watchlist stocks unsubscribed before delete");
        } catch (unsubscribeError) {
          console.warn(
            "Unsubscribe failed before deleting watchlist:",
            unsubscribeError
          );
        }
      }

      await deleteWatchlist(id);

      setWatchlistStockCache((prev) => {
        const updatedCache = { ...prev };
        delete updatedCache[id];

        writeCache(CACHE_KEYS.WATCHLIST_STOCK_CACHE, updatedCache);
        return updatedCache;
      });

      const updatedWatchlists = await loadWatchlists();

      if (updatedWatchlists.length > 0) {
        await loadWatchlistStocks(updatedWatchlists[0], { forceRefresh: true });
      } else {
        saveSelectedWatchlist(null);
        saveCurrentWatchlistStocks(null, []);
        removeCache(CACHE_KEYS.WATCHLIST_STOCKS);
      }
    } catch (error) {
      console.error("Error deleting watchlist:", error);
      alert(error.message || "Failed to delete watchlist");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWatchlist = async (watchlist) => {
    await loadWatchlistStocks(watchlist);
  };

  // ─── Stock search ──────────────────────────────────────────────────────────

  const handleSearchStocks = async (query) => {
    if (!query.trim()) return [];

    try {
      const data = await searchStocks(query);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error searching stocks:", error);
      return [];
    }
  };

  // ─── Add stock ─────────────────────────────────────────────────────────────

 const handleAddStock = async (stock) => {
  if (!selectedWatchlist) {
    alert("Please select a watchlist first");
    return;
  }

  const watchlistId = getId(selectedWatchlist);
  const stockId = getStockId(stock);

  if (!watchlistId) {
    alert("Watchlist ID not found");
    return;
  }

  if (!stockId) {
    alert("Stock ID not found");
    return;
  }

  const alreadyAdded = watchlistStocks.find(
    (item) => String(getStockId(item)) === String(stockId)
  );

  if (alreadyAdded) {
    alert(`${stock.symbol} is already in this watchlist`);
    return;
  }

  const previousStocks = watchlistStocks;

  const temporaryStock = {
    ...stock,
    ltp: Number(stock.ltp || stock.price || stock.close || 0),
    price: Number(stock.ltp || stock.price || stock.close || 0),
  };

  // 1. UI mein company instantly show hogi
  saveCurrentWatchlistStocks(watchlistId, [...watchlistStocks, temporaryStock]);

  try {
    setSaving(true);

    // 2. First DB mein stock add karo
    await addToWatchlist(watchlistId, stockId);

    // 3. Fresh watchlist stocks fetch karo
    // Isse backend se proper exchangeInstrumentID / exchangeSegment milega
    const freshSavedStocks = await getWatchlistStocks(watchlistId);
    const normalizedFreshStocks = normalizeStocks(freshSavedStocks);

    // 4. Fresh list ko UI/cache mein save karo
    saveCurrentWatchlistStocks(watchlistId, normalizedFreshStocks);

    // 5. Added stock ka full backend object find karo
    const addedFullStock =
      normalizedFreshStocks.find(
        (item) => String(getStockId(item)) === String(stockId)
      ) ||
      normalizedFreshStocks.find(
        (item) =>
          item.symbol?.toLowerCase() === stock.symbol?.toLowerCase()
      );

    if (!addedFullStock) {
      console.warn("Added stock not found in fresh watchlist response:", stock);
      return;
    }

    const instrumentKey = getInstrumentKey(addedFullStock);

    console.log("Fresh added stock for live subscribe:", {
      symbol: addedFullStock.symbol,
      instrumentKey,
      addedFullStock,
    });

    // 6. Agar proper instrument key mila tabhi subscribe karo
    if (
      ENABLE_LIVE_SOCKET &&
      SOCKET_BASE_URL &&
      SUBSCRIPTION_BASE_URL &&
      instrumentKey &&
      !instrumentKey.startsWith("SYMBOL-")
    ) {
      try {
        await subscribeTouchline([addedFullStock]);
        console.log("New stock subscribed to live feed:", {
          symbol: addedFullStock.symbol,
          instrumentKey,
        });
      } catch (subscribeError) {
        console.warn("Stock added but live subscribe failed:", subscribeError);
      }
    } else {
      console.warn(
        "Live subscribe skipped because exchangeInstrumentID is missing:",
        {
          symbol: addedFullStock.symbol,
          instrumentKey,
          addedFullStock,
        }
      );
    }

    // 7. Initial chart data seed karo if price exists
    const initialPrice = Number(
      addedFullStock.ltp ||
        addedFullStock.price ||
        addedFullStock.close ||
        temporaryStock.ltp ||
        0
    );

    if (instrumentKey && initialPrice) {
      setChartDataByStock((prev) => {
        const oldData = prev[instrumentKey] || [];

        return {
          ...prev,
          [instrumentKey]: [
            ...oldData.slice(-50),
            {
              time: new Date().toLocaleTimeString(),
              price: initialPrice,
            },
          ],
        };
      });
    }

    console.log("Stock added successfully:", stock.symbol);
  } catch (error) {
    console.error("Error adding stock:", error);

    // Rollback UI
    saveCurrentWatchlistStocks(watchlistId, previousStocks);

    alert(error.message || "Failed to add stock");
  } finally {
    setSaving(false);
  }
};

  // ─── Remove stock ──────────────────────────────────────────────────────────

  const handleRemoveStock = async (stockId) => {
    try {
      if (!selectedWatchlist) {
        alert("Please select a watchlist first");
        return;
      }

      const watchlistId = getId(selectedWatchlist);

      if (!watchlistId) {
        alert("Watchlist ID not found");
        return;
      }

      const removedStock = watchlistStocks.find(
        (stock) => String(getStockId(stock)) === String(stockId)
      );

      setSaving(true);

      if (removedStock) {
        try {
          await unsubscribeTouchline([removedStock]);
          console.log(
            "Stock unsubscribed from live feed:",
            removedStock.symbol || getInstrumentKey(removedStock)
          );
        } catch (unsubscribeError) {
          console.warn(
            "Unsubscribe failed, still removing from watchlist:",
            unsubscribeError
          );
        }
      }

      await removeFromWatchlist(watchlistId, stockId);

      const updatedStocks = watchlistStocks.filter(
        (stock) => String(getStockId(stock)) !== String(stockId)
      );

      saveCurrentWatchlistStocks(watchlistId, updatedStocks);

      const removedSymbolKey = removedStock?.symbol
        ? `SYMBOL-${removedStock.symbol.toUpperCase()}`
        : "";

      const removedInstrumentKey = getInstrumentKey(removedStock);

      setChartDataByStock((prev) => {
        const updated = { ...prev };

        if (removedSymbolKey) {
          delete updated[removedSymbolKey];
        }

        if (removedInstrumentKey) {
          delete updated[removedInstrumentKey];
        }

        return updated;
      });
    } catch (error) {
      console.error("Error removing stock:", error);
      alert(error.message || "Failed to remove stock");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Watchlist
      stocks={stocks}
      watchlists={watchlists}
      selectedWatchlist={selectedWatchlist}
      watchlist={watchlistStocks}
      newWatchlistName={newWatchlistName}
      setNewWatchlistName={setNewWatchlistName}
      loading={loading}
      saving={saving}
      error={error}
      socketStatus={socketStatus}
      chartDataByStock={chartDataByStock}
      onCreateWatchlist={handleCreateWatchlist}
      onSelectWatchlist={handleSelectWatchlist}
      onDeleteWatchlist={handleDeleteWatchlist}
      onAddStock={handleAddStock}
      onRemoveStock={handleRemoveStock}
      onSearchStocks={handleSearchStocks}
    />
  );
}

export default WatchlistPage;