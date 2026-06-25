import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInstrumentKey } from "../../Apii/liveSocket";

function Watchlist({
  stocks = [],
  watchlists = [],
  selectedWatchlist = null,
  newWatchlistName = "",
  setNewWatchlistName = () => {},
  watchlist = [],
  loading = false,
  saving = false,
  error = "",
  socketStatus = "idle",
  chartDataByStock = {},
  onCreateWatchlist,
  onSelectWatchlist,
  onDeleteWatchlist,
  onAddStock,
  onRemoveStock,
  onSearchStocks,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCreateBox, setShowCreateBox] = useState(false);

  const getWatchlistId = (item) => {
    return item?.id || item?.watchlist_id || item?.uuid;
  };

  const getStockId = (item) => {
    return item?.stock_id || item?.id || item?.uuid;
  };

  const getStockUniqueKey = (stock) => {
    return (
      getStockId(stock) ||
      getInstrumentKey(stock) ||
      stock?.symbol ||
      stock?.company_name ||
      stock?.name
    );
  };

  useEffect(() => {
    setSearch("");
  }, [selectedWatchlist]);

  const filtered = watchlist.filter(
    (stock) =>
      stock.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      stock.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      stock.name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedWatchlistId = getWatchlistId(selectedWatchlist);

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "₹0.00";
    }
    return `₹${Number(price).toFixed(2)}`;
  };

  const getChangeValue = (stock) => {
    return Number(stock?.percentChange || stock?.change_pct || 0);
  };

  const isStockAlreadyAdded = (stock) => {
    const stockKey = getStockUniqueKey(stock);
    return watchlist.some(
      (item) => String(getStockUniqueKey(item)) === String(stockKey)
    );
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      alert("Please enter watchlist name");
      return;
    }
    await onCreateWatchlist();
    setShowCreateBox(false);
  };

  const handleDeleteWatchlist = async (e, item) => {
    e.stopPropagation();
    if (!onDeleteWatchlist) {
      alert("Delete function not connected");
      return;
    }
    await onDeleteWatchlist(item);
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
    setShowAdd(false);
    setAddSearch("");
    setApiSearchResults([]);
    await onAddStock(stock);
  };

  const handleRemove = async (stock) => {
    const confirmRemove = window.confirm(
      `Remove ${stock.symbol || "this stock"} from watchlist?`
    );
    if (!confirmRemove) return;
    await onRemoveStock(getStockId(stock));
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setAddSearch("");
    setApiSearchResults([]);
  };

  const openStockDetail = (stock) => {
    const stockId =
      getStockId(stock) ||
      getInstrumentKey(stock) ||
      stock.symbol ||
      "stock";
    const instrumentKey = getInstrumentKey(stock);

    const stockPayload = {
      stock,
      chartData: instrumentKey
        ? chartDataByStock[instrumentKey] || []
        : [],
      socketStatus,
    };

    sessionStorage.setItem(
      "selected_stock_detail",
      JSON.stringify(stockPayload)
    );

    navigate(`/stock/${stockId}`, {
      state: stockPayload,
    });
  };

  const openAddModal = () => {
    if (!selectedWatchlist) {
      alert("Please select a watchlist first");
      return;
    }
    setShowAdd(true);
  };

  return (
    <div className="min-h-[calc(100vh-61px)] bg-gray-50">
      {/* Top Watchlist Tabs */}
      <div className="bg-white border-b border-gray-200 px-8 pt-6">
        <div className="flex items-start justify-between gap-4">

          {/* Watchlist Names */}
          <div className="flex items-center gap-8 overflow-x-auto flex-1">
            {watchlists.length === 0 ? (
              <p className="pb-4 text-sm text-gray-400">No watchlist created</p>
            ) : (
              watchlists.map((item) => {
                const itemId = getWatchlistId(item);
                const activeTab =
                  String(selectedWatchlistId) === String(itemId);

                return (
                  <div key={itemId} className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectWatchlist(item)}
                      className={`pb-4 text-sm font-medium whitespace-nowrap ${
                        activeTab
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {item.name || "Untitled Watchlist"}
                    </button>

                    {activeTab && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWatchlist(e, item)}
                        disabled={saving}
                        title="Delete watchlist"
                        className="mb-4 w-5 h-5 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 disabled:text-gray-400"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Fixed Right: Create Watchlist */}
          <div className="shrink-0 pb-4 bg-white pl-4">
            {!showCreateBox ? (
              <button
                type="button"
                onClick={() => setShowCreateBox(true)}
                disabled={saving}
                className="text-sm font-medium text-green-600 hover:text-green-700 disabled:text-gray-400 whitespace-nowrap"
              >
                + Watchlist
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Watchlist name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-44 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateWatchlist}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:bg-green-300"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBox(false);
                    setNewWatchlistName("");
                  }}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white px-8 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedWatchlist?.name || "Select Watchlist"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {watchlist.length} stocks
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search your stocks "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stocks Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100">
              <tr className="text-xs text-gray-400">
                <th className="px-6 py-4 font-medium">
                  Company ({filtered.length})
                </th>
                <th className="px-6 py-4 font-medium">Mkt price</th>
                <th className="px-6 py-4 font-medium">1D change</th>
                <th className="px-6 py-4 font-medium">Volume</th>
                <th className="px-6 py-4 font-medium">Instrument Key</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-sm text-gray-400"
                  >
                    Loading watchlist...
                  </td>
                </tr>
              ) : !selectedWatchlist ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-sm text-gray-400"
                  >
                    Please select a watchlist
                  </td>
                </tr>
              ) : watchlist.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-semibold">
                        +
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          No stocks added yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Add your first stock to this watchlist
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddModal}
                        disabled={saving}
                        className="mt-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        + Add Symbol
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-sm text-gray-400"
                  >
                    No matching stocks found
                  </td>
                </tr>
              ) : (
                filtered.map((stock) => {
                  const isUp = getChangeValue(stock) >= 0;
                  const stockInstrumentKey = getInstrumentKey(stock);

                  return (
                    <tr
                      key={getStockUniqueKey(stock)}
                      onClick={() => openStockDetail(stock)}
                      className="border-b border-gray-100 cursor-pointer transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700">
                            {stock.symbol?.slice(0, 2) || "ST"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {stock.company_name ||
                                stock.name ||
                                stock.symbol}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {stock.symbol || "N/A"} ·{" "}
                              {stock.exchange || "NSE"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatPrice(stock.ltp || stock.price)}
                      </td>

                      <td
                        className={`px-6 py-4 text-sm font-semibold ${
                          isUp ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {stock.percentChange || stock.change_pct || 0}%
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {stock.volume || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {stockInstrumentKey || "N/A"}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(stock);
                          }}
                          disabled={saving}
                          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:text-gray-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Add Stock Button */}
      {selectedWatchlist && (
        <button
          type="button"
          onClick={openAddModal}
          disabled={saving}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:bg-blue-300"
        >
          <span className="text-xl leading-none">+</span>
          Add Symbol
        </button>
      )}

      {/* Add Symbol Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Symbol
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Search and add stock to{" "}
                  <span className="font-medium text-blue-600">
                    {selectedWatchlist?.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <input
                type="text"
                placeholder="Search by symbol or company name..."
                value={addSearch}
                onChange={handleSearchChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
                autoFocus
              />

              <div className="mt-4 max-h-[420px] overflow-y-auto border border-gray-100 rounded-xl">
                {searchLoading ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    Searching stocks...
                  </div>
                ) : addSearch.trim() === "" ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    Type symbol or company name to search
                  </div>
                ) : apiSearchResults.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    No stocks found
                  </div>
                ) : (
                  apiSearchResults.map((stock) => {
                    const stockKey = getStockUniqueKey(stock);
                    const alreadyAdded = isStockAlreadyAdded(stock);

                    return (
                      <div
                        key={stockKey}
                        className="flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {stock.symbol || "N/A"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {stock.company_name ||
                              stock.name ||
                              "No company name"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {stock.exchange || "NSE"} ·{" "}
                            {formatPrice(stock.ltp || stock.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(stock)}
                          disabled={alreadyAdded || saving}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                            alreadyAdded
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {alreadyAdded ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Watchlist;