const BASE_URL = "https://watchlist-tdin.onrender.com/api";

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;

  if (body && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }

  if (!response.ok) {
    throw new Error(
      result?.message || result?.error || `HTTP Error: ${response.status}`
    );
  }

  return result;
};