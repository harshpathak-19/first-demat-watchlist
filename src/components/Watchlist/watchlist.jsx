import { useEffect, useState } from "react";
import StockItem from "../StockItem/stockItem";

function Watchlist({
  stocks = [],

  // Multiple watchlists
  watchlists = [],
  selectedWatchlist = null,
  newWatchlistName = "",
  setNewWatchlistName = () => {},

  // Selected watchlist stocks
  watchlist = [],

  loading = false,
  saving = false,
  error = "",

  onCreateWatchlist,
  onSelectWatchlist,
  onAddStock,
  onRemoveStock,

  // Stock search API function
  onSearchStocks,
}) {
  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const getWatchlistId = (item) => {
    return item?.id || item?.watchlist_id || item?.uuid;
  };

  const getStockId = (item) => {
    return item?.stock_id || item?.id || item?.uuid;
  };

  useEffect(() => {
    setSelected(0);
    setSearch("");
  }, [selectedWatchlist]);

  const filtered = watchlist.filter(
    (stock) =>
      stock.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      stock.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      stock.name?.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered[selected] || null;

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      alert("Please enter watchlist name");
      return;
    }

    await onCreateWatchlist();
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setAddSearch(value);

    if (!value.trim()) {
      setApiSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);

      let results = [];

      if (onSearchStocks) {
        results = await onSearchStocks(value);
      } else {
        results = stocks.filter(
          (stock) =>
            stock.symbol?.toLowerCase().includes(value.toLowerCase()) ||
            stock.company_name?.toLowerCase().includes(value.toLowerCase()) ||
            stock.name?.toLowerCase().includes(value.toLowerCase())
        );
      }

      setApiSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error("Search error:", error);
      setApiSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAdd = async (stock) => {
    await onAddStock(stock);

    setShowAdd(false);
    setAddSearch("");
    setApiSearchResults([]);
  };

  const handleRemove = async (stockId) => {
    await onRemoveStock(stockId);
    setSelected(0);
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "₹0.00";
    }

    return `₹${Number(price).toFixed(2)}`;
  };

  const selectedWatchlistId = getWatchlistId(selectedWatchlist);

  return (
    <div className="flex h-[calc(100vh-61px)]">
      {/* Left Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Create Watchlist Section */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Watchlists
          </h2>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Banking, Tech..."
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none"
            />

            <button
              onClick={handleCreateWatchlist}
              disabled={saving}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs disabled:bg-blue-300"
            >
              +
            </button>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {watchlists.length === 0 ? (
              <p className="text-xs text-gray-400">No watchlist created</p>
            ) : (
              watchlists.map((item) => {
                const itemId = getWatchlistId(item);

                return (
                  <div
                    key={itemId}
                    onClick={() => onSelectWatchlist(item)}
                    className={`px-3 py-2 rounded-lg cursor-pointer text-xs font-medium ${
                      String(selectedWatchlistId) === String(itemId)
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {item.name || "Untitled Watchlist"}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Watchlist Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedWatchlist?.name || "Select Watchlist"}
            </h2>

            <span className="text-xs text-gray-400">
              {watchlist.length} stocks
            </span>
          </div>

          <input
            type="text"
            placeholder="Search selected watchlist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none"
          />
        </div>

        {/* Stocks inside selected watchlist */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-gray-400">
              Loading watchlist...
            </div>
          ) : !selectedWatchlist ? (
            <div className="px-5 py-8 text-center text-xs text-gray-400">
              Please select a watchlist
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-gray-400">
              No stocks added
            </div>
          ) : (
            filtered.map((stock, index) => (
              <StockItem
                key={getStockId(stock)}
                stock={stock}
                isSelected={index === selected}
                onClick={() => setSelected(index)}
              />
            ))
          )}
        </div>

        {/* Add Symbol Button */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowAdd(true)}
            disabled={!selectedWatchlist}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 disabled:opacity-50"
          >
            + Add symbol
          </button>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 bg-gray-50 p-8">
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {showAdd ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Add Symbol to {selectedWatchlist?.name}
              </h2>

              <button
                onClick={() => {
                  setShowAdd(false);
                  setAddSearch("");
                  setApiSearchResults([]);
                }}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              placeholder="Search company or symbol..."
              value={addSearch}
              onChange={handleSearchChange}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 outline-none"
              autoFocus
            />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {searchLoading ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  Searching stocks...
                </div>
              ) : addSearch === "" ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  Type to search stocks
                </div>
              ) : apiSearchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  No stocks found
                </div>
              ) : (
                apiSearchResults.map((stock) => {
                  const stockId = getStockId(stock);

                  const alreadyAdded = watchlist.some(
                    (item) => String(getStockId(item)) === String(stockId)
                  );

                  return (
                    <div
                      key={stockId}
                      className="flex items-center justify-between px-5 py-3 border-b"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {stock.symbol || "N/A"}
                        </p>

                        <p className="text-xs text-gray-400">
                          {stock.company_name ||
                            stock.name ||
                            "No company name"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatPrice(stock.ltp || stock.price)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAdd(stock)}
                        disabled={alreadyAdded || saving}
                        className={`text-xs px-3 py-1.5 rounded-lg ${
                          alreadyAdded
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {alreadyAdded
                          ? "Added"
                          : saving
                          ? "Saving..."
                          : "+ Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : active ? (
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {active.symbol || "N/A"}
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              {active.company_name || active.name || "No company name"}
            </p>

            <p className="text-sm mt-3">
              Exchange: {active.exchange || "N/A"}
            </p>

            <p className="text-xl font-semibold mt-3">
              {formatPrice(active.ltp || active.price)}
            </p>

            <button
              onClick={() => handleRemove(getStockId(active))}
              disabled={saving}
              className="mt-4 text-xs text-red-500 disabled:text-gray-400"
            >
              {saving ? "Removing..." : "Remove from watchlist"}
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            {selectedWatchlist
              ? "Add a stock to this watchlist"
              : "Create or select a watchlist"}
          </div>
        )}
      </div>
    </div>
  );
}

export default Watchlist;