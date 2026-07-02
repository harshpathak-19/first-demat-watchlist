import { apiRequest } from "./CommonAPI";

export const searchStocks = async (query) => {
  const result = await apiRequest(
    `/search/stocks?query=${encodeURIComponent(query)}`
  );

  return result.data || result.stocks || result || [];
};

export const getAllStocks = async () => {
  const result = await apiRequest("/search/stocks?query=Nse");

  return result.data || result.stocks || result || [];
};