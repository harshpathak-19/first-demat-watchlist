import { apiRequest } from "./CommonAPI";

export const createWatchlist = async (name) => {
  return await apiRequest("/watchlists", {
    method: "POST",
    body: {
      name,
    },
  });
};

export const getAllWatchlists = async () => {
  const result = await apiRequest("/watchlists");
  return result.data || result || [];
};

export const deleteWatchlist = async (watchlistId) => {
  return await apiRequest(`/watchlists/${watchlistId}`, {
    method: "DELETE",
  });
};

export const addStockToWatchlist = async (watchlistId, stockId) => {
  return await apiRequest(`/watchlists/${watchlistId}/stocks`, {
    method: "POST",
    body: {
      stock_id: stockId,
    },
  });
};