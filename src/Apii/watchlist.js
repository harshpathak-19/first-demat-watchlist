import { apiRequest } from "./CommonAPI";

// Get all watchlists
export const getWatchlists = async () => {
  const result = await apiRequest("/watchlists");

  return result.data || result.watchlists || result || [];
};

// Create new watchlist
export const createWatchlist = async (name) => {
  const result = await apiRequest("/watchlists", {
    method: "POST",
    body: {
      name,
    },
  });

  return result.data || result.watchlist || result;
};

// Delete watchlist
export const deleteWatchlist = async (watchlistId) => {
  return await apiRequest(`/watchlists/${watchlistId}`, {
    method: "DELETE",
  });
};

// Get stocks from selected watchlist
export const getWatchlistStocks = async (watchlistId) => {
  const result = await apiRequest(`/watchlists/${watchlistId}/stocks`);

  return result.data || result.stocks || result || [];
};

// Add stock to selected watchlist
export const addToWatchlist = async (watchlistId, stockId) => {
  const userId = localStorage.getItem("user_id");
  const query = userId ? `?user_id=${userId}` : "";

  return await apiRequest(`/watchlists/${watchlistId}/stocks${query}`, {
    method: "POST",
    body: {
      stock_id: stockId,
    },
  });
};

// Remove stock from selected watchlist
export const removeFromWatchlist = async (watchlistId, stockId) => {
  return await apiRequest(`/watchlists/${watchlistId}/stocks/${stockId}`, {
    method: "DELETE",
  });
};