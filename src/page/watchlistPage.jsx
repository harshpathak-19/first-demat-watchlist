import { useEffect, useState } from "react";
import Watchlist from "../components/Watchlist/watchlist";

import { getAllStocks, searchStocks } from "../Apii/stockApi";

import {
  getWatchlists,
  createWatchlist,
  getWatchlistStocks,
  addToWatchlist,
  removeFromWatchlist,
} from "../Apii/watchlist";

function WatchlistPage() {
  const [stocks, setStocks] = useState([]);

  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [watchlistStocks, setWatchlistStocks] = useState([]);

  const [newWatchlistName, setNewWatchlistName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getId = (item) => {
    return item?.id || item?.watchlist_id || item?.uuid;
  };

  const normalizeStocks = (list) => {
    if (!Array.isArray(list)) return [];

    return list.map((item) => item.stock || item);
  };

  const loadWatchlists = async () => {
    const data = await getWatchlists();

    const list = Array.isArray(data) ? data : [];

    setWatchlists(list);

    return list;
  };

  const loadWatchlistStocks = async (watchlist) => {
    if (!watchlist) return;

    const id = getId(watchlist);

    if (!id) {
      console.error("Watchlist ID not found:", watchlist);
      return;
    }

    const savedStocks = await getWatchlistStocks(id);

    setSelectedWatchlist(watchlist);
    setWatchlistStocks(normalizeStocks(savedStocks));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // Initial stock list load
        const allStocks = await getAllStocks();
        setStocks(Array.isArray(allStocks) ? allStocks : []);

        // User watchlists load
        let userWatchlists = await loadWatchlists();

        // Agar user ki watchlist nahi hai, default create karo
        if (!userWatchlists || userWatchlists.length === 0) {
          const defaultWatchlist = await createWatchlist("My Watchlist");

          userWatchlists = await loadWatchlists();

          const firstWatchlist = userWatchlists[0] || defaultWatchlist;

          await loadWatchlistStocks(firstWatchlist);

          return;
        }

        // First watchlist by default select karo
        await loadWatchlistStocks(userWatchlists[0]);
      } catch (error) {
        console.error("Error loading watchlist page:", error);
        setError(error.message || "Failed to load watchlist");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      alert("Please enter watchlist name");
      return;
    }

    try {
      setSaving(true);

      const name = newWatchlistName.trim();

      await createWatchlist(name);

      setNewWatchlistName("");

      const updatedWatchlists = await loadWatchlists();

      const createdWatchlist =
        updatedWatchlists.find(
          (item) => item.name?.toLowerCase() === name.toLowerCase()
        ) || updatedWatchlists[updatedWatchlists.length - 1];

      if (createdWatchlist) {
        await loadWatchlistStocks(createdWatchlist);
      }
    } catch (error) {
      console.error("Error creating watchlist:", error);
      alert(error.message || "Failed to create watchlist");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWatchlist = async (watchlist) => {
    try {
      setSaving(true);

      await loadWatchlistStocks(watchlist);
    } catch (error) {
      console.error("Error selecting watchlist:", error);
      alert(error.message || "Failed to load selected watchlist");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchStocks = async (query) => {
    if (!query.trim()) {
      return [];
    }

    try {
      const data = await searchStocks(query);

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error searching stocks:", error);
      return [];
    }
  };

  const handleAddStock = async (stock) => {
    try {
      if (!selectedWatchlist) {
        alert("Please select a watchlist first");
        return;
      }

      const watchlistId = getId(selectedWatchlist);
      const stockId = stock.id || stock.stock_id;

      if (!watchlistId) {
        alert("Watchlist ID not found");
        return;
      }

      if (!stockId) {
        alert("Stock ID not found");
        return;
      }

      const alreadyAdded = watchlistStocks.find(
        (item) => String(item.id || item.stock_id) === String(stockId)
      );

      if (alreadyAdded) {
        alert(`${stock.symbol} is already in this watchlist`);
        return;
      }

      setSaving(true);

      await addToWatchlist(watchlistId, stockId);

      setWatchlistStocks((prev) => [...prev, stock]);
    } catch (error) {
      console.error("Error adding stock:", error);
      alert(error.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

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

      setSaving(true);

      await removeFromWatchlist(watchlistId, stockId);

      setWatchlistStocks((prev) =>
        prev.filter(
          (stock) => String(stock.id || stock.stock_id) !== String(stockId)
        )
      );
    } catch (error) {
      console.error("Error removing stock:", error);
      alert(error.message || "Failed to remove stock");
    } finally {
      setSaving(false);
    }
  };

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
      onCreateWatchlist={handleCreateWatchlist}
      onSelectWatchlist={handleSelectWatchlist}
      onAddStock={handleAddStock}
      onRemoveStock={handleRemoveStock}
      onSearchStocks={handleSearchStocks}
    />
  );
}

export default WatchlistPage;