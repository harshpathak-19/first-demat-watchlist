import { apiRequest } from "./CommonAPI";

export const getWatchlists = async () => {
  const result = await apiRequest("/watchlists");

  return result.data || result.watchlists || result || [];
};

export const createWatchlist = async (name) => {
  const result = await apiRequest("/watchlists", {
    method: "POST",
    body: {
      name,
    },
  });

  return result.data || result.watchlist || result;
};

export const deleteWatchlist = async (watchlistId) => {
  return await apiRequest(`/watchlists/${watchlistId}`, {
    method: "DELETE",
  });
};

export const getWatchlistStocks = async (watchlistId) => {
  const result = await apiRequest(`/watchlists/${watchlistId}/stocks`);

  return result.data || result.stocks || result || [];
};

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

export const removeFromWatchlist = async (watchlistId, stockId) => {
  return await apiRequest(`/watchlists/${watchlistId}/stocks/${stockId}`, {
    method: "DELETE",
  });
};