let marketSocket = null;
let rawMessageListener = null;
const messageCallbacks = new Set();
const activeInstrumentKeys = new Set();

const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_BASE_URL;
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "";

const SUBSCRIPTION_BASE_URL = import.meta.env.VITE_SUBSCRIPTION_BASE_URL;
const SUBSCRIPTION_PATH = import.meta.env.VITE_SUBSCRIPTION_PATH || "";

const UNSUBSCRIPTION_BASE_URL =
  import.meta.env.VITE_UNSUBSCRIPTION_BASE_URL ||
  import.meta.env.VITE_SUBSCRIPTION_BASE_URL;
const UNSUBSCRIPTION_PATH = import.meta.env.VITE_UNSUBSCRIPTION_PATH || "";

const getSocketUrl = () => {
  if (!SOCKET_BASE_URL) {
    throw new Error("WebSocket URL not found");
  }

  const token = localStorage.getItem("token");
  const baseUrl = `${SOCKET_BASE_URL}${SOCKET_PATH}`;

  if (token) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  return baseUrl;
};

export const getInstrumentFromStock = (stock) => {
  return {
    symbol: stock?.symbol || stock?.Symbol || "",

    exchangeSegment: Number(
      stock?.exchangeSegment ||
        stock?.ExchangeSegment ||
        stock?.exchange_segment ||
        stock?.exchange_segment_id ||
        stock?.ExchangeSegmentID ||
        1
    ),

    exchangeInstrumentID: Number(
      stock?.exchangeInstrumentID ||
        stock?.ExchangeInstrumentID ||
        stock?.exchange_instrument_id ||
        stock?.instrument_token ||
        stock?.instrumentToken ||
        stock?.exchangeToken ||
        0
    ),
  };
};

export const buildInstruments = (stocks = []) => {
  return stocks
    .map(getInstrumentFromStock)
    .filter((item) => item.exchangeSegment && item.exchangeInstrumentID)
    .map((item) => ({
      exchangeSegment: Number(item.exchangeSegment),
      exchangeInstrumentID: Number(item.exchangeInstrumentID),
    }));
};

export const getInstrumentKey = (stockOrTick) => {
  const instrument = getInstrumentFromStock(stockOrTick);

  if (instrument.exchangeSegment && instrument.exchangeInstrumentID) {
    return `${instrument.exchangeSegment}-${instrument.exchangeInstrumentID}`;
  }

  if (instrument.symbol) {
    return `SYMBOL-${instrument.symbol.toUpperCase()}`;
  }

  return "";
};

export const connectMarketSocket = () => {
  if (
    marketSocket &&
    (marketSocket.readyState === WebSocket.OPEN ||
      marketSocket.readyState === WebSocket.CONNECTING)
  ) {
    return marketSocket;
  }

  const socketUrl = getSocketUrl();

  console.log("Connecting raw WebSocket:", socketUrl);

  marketSocket = new WebSocket(socketUrl);

  marketSocket.onopen = () => {
    console.log("✅ Raw WebSocket connected");
  };

  marketSocket.onerror = (error) => {
    console.error("⚠️ Raw WebSocket error:", error);
  };

  marketSocket.onclose = (event) => {
    console.log("❌ Raw WebSocket closed:", event.reason || event.code);
    if (rawMessageListener) {
      marketSocket?.removeEventListener("message", rawMessageListener);
      rawMessageListener = null;
    }
    marketSocket = null;
  };

  return marketSocket;
};

const waitForSocketOpen = () => {
  return new Promise((resolve, reject) => {
    if (!marketSocket) {
      reject(new Error("WebSocket not created"));
      return;
    }

    if (marketSocket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("WebSocket connection timeout"));
    }, 10000);

    marketSocket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const callMarketApi = async ({
  baseUrl,
  path,
  instruments,
  actionName = "Market API",
}) => {
  if (!baseUrl || !path) {
    throw new Error(`${actionName} URL not found`);
  }

  if (!instruments.length) {
    console.warn(`No valid instruments found for ${actionName}`);
    return null;
  }

  const payload = {
    instruments,
    xtsMessageCode: 1501,
  };

  console.log(`Calling ${actionName}:`, payload);

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`${actionName} failed:`, result);
    throw new Error(result?.message || `${actionName} failed`);
  }

  console.log(`✅ ${actionName} success:`, result);
  return result;
};

export const subscribeTouchline = async (stocks = []) => {
  connectMarketSocket();
  await waitForSocketOpen();

  const instruments = buildInstruments(stocks);

  if (!instruments.length) {
    console.warn("No valid instruments found for subscription API");
    return;
  }

  await callMarketApi({
    baseUrl: SUBSCRIPTION_BASE_URL,
    path: SUBSCRIPTION_PATH,
    instruments,
    actionName: "Subscription API",
  });

  instruments.forEach((item) => {
    activeInstrumentKeys.add(
      `${item.exchangeSegment}-${item.exchangeInstrumentID}`
    );
  });

  console.log("Active subscribed instruments:", [...activeInstrumentKeys]);
};

export const unsubscribeTouchline = async (stocks = []) => {
  const instruments = buildInstruments(stocks);

  if (!instruments.length) {
    console.warn("No valid instruments found for unsubscription API");
    return;
  }

  try {
    await callMarketApi({
      baseUrl: UNSUBSCRIPTION_BASE_URL,
      path: UNSUBSCRIPTION_PATH,
      instruments,
      actionName: "Unsubscription API",
    });
  } finally {
    // Backend unsubscribe fail bhi ho jaye, frontend removed stock ke ticks ignore karega
    instruments.forEach((item) => {
      activeInstrumentKeys.delete(
        `${item.exchangeSegment}-${item.exchangeInstrumentID}`
      );
    });

    console.log("Active subscribed instruments after unsubscribe:", [
      ...activeInstrumentKeys,
    ]);
     if (activeInstrumentKeys.size === 0) {
    console.log("No active instruments left. Closing WebSocket.");
    disconnectMarketSocket();
  }
  }
};

export const disconnectMarketSocket = () => {
  if (marketSocket) {
    marketSocket.close();
    marketSocket = null;
    console.log("Raw WebSocket disconnected manually");
  }
  activeInstrumentKeys.clear();
  messageCallbacks.clear();
};

const safeJsonParse = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    const cleanedValue = value.trim().replace(/\*+$/, "");
    return JSON.parse(cleanedValue);
  } catch {
    return value;
  }
};

const normalizeTick = (stock) => {
  return {
    symbol: stock?.symbol || stock?.Symbol || "",

    exchangeSegment: Number(
      stock?.exchangeSegment ||
        stock?.ExchangeSegment ||
        stock?.exchange_segment ||
        stock?.exchange_segment_id ||
        stock?.ExchangeSegmentID ||
        1
    ),

    exchangeInstrumentID: Number(
      stock?.exchangeInstrumentID ||
        stock?.ExchangeInstrumentID ||
        stock?.exchange_instrument_id ||
        stock?.instrument_token ||
        stock?.instrumentToken ||
        stock?.exchangeToken ||
        0
    ),

    ltp: Number(
      stock?.ltp ||
        stock?.LTP ||
        stock?.last_price ||
        stock?.price ||
        stock?.LastTradedPrice ||
        stock?.Touchline?.LastTradedPrice ||
        0
    ),

    open: Number(stock?.open || stock?.Open || stock?.Touchline?.Open || 0),

    high: Number(stock?.high || stock?.High || stock?.Touchline?.High || 0),

    low: Number(stock?.low || stock?.Low || stock?.Touchline?.Low || 0),

    close: Number(
      stock?.close || stock?.Close || stock?.Touchline?.Close || 0
    ),

    change: Number(
      stock?.change ||
        stock?.netChange ||
        stock?.NetChange ||
        stock?.Touchline?.NetChange ||
        0
    ),

    percentChange: Number(
      stock?.change_pct ||
        stock?.changePct ||
        stock?.percentChange ||
        stock?.changePercent ||
        stock?.PercentChange ||
        stock?.Touchline?.PercentChange ||
        0
    ),

    volume: Number(
      stock?.volume ||
        stock?.Volume ||
        stock?.totalVolume ||
        stock?.TotalTradedVolume ||
        stock?.totalTradedQty ||
        stock?.TotalTradedQty ||
        stock?.Touchline?.TotalTradedQuantity ||
        0
    ),
  };
};

const handleStockTick = (stock) => {
  const tick = normalizeTick(stock);

  if (!tick.exchangeInstrumentID) {
    console.warn("Tick instrument ID not found:", stock);
    return;
  }

  const tickKey = getInstrumentKey(tick);

  // Agar activeInstrumentKeys empty hai, allow kar do.
  // Agar activeInstrumentKeys mein data hai, removed stock ka tick ignore hoga.
  // Sirf subscribed instruments ke ticks allow honge.
// Agar koi stock subscribed nahi hai, toh saare ticks ignore honge.
if (!activeInstrumentKeys.has(tickKey)) {
  console.log("Ignored unsubscribed tick:", tickKey);
  return;
}

  console.log("✅ Live stock tick received:", tick);

  messageCallbacks.forEach((callback) => {
    callback(tick);
  });
};

const handleRawSocketMessage = (event) => {
  console.log("Raw WebSocket message:", event.data);

  const data = safeJsonParse(event.data);

  if (data?.type === "touchline" && data?.data) {
    handleStockTick(data.data);
    return;
  }

  if (Array.isArray(data?.stocks)) {
    data.stocks.forEach(handleStockTick);
    return;
  }

  if (Array.isArray(data?.data)) {
    data.data.forEach(handleStockTick);
    return;
  }

  if (Array.isArray(data)) {
    data.forEach(handleStockTick);
    return;
  }

  if (
    data?.exchangeInstrumentID ||
    data?.ExchangeInstrumentID ||
    data?.instrument_token ||
    data?.instrumentToken ||
    data?.exchangeToken
  ) {
    handleStockTick(data);
    return;
  }

  console.warn("Unknown raw WebSocket payload:", data);
};

export const listenTouchlineUpdates = (callback) => {
  if (!marketSocket) {
    throw new Error("WebSocket not connected");
  }

  messageCallbacks.add(callback);

  if (!rawMessageListener) {
    rawMessageListener = handleRawSocketMessage;
    marketSocket.addEventListener("message", rawMessageListener);
  }

  return () => {
    messageCallbacks.delete(callback);

    if (
      marketSocket &&
      rawMessageListener &&
      messageCallbacks.size === 0
    ) {
      marketSocket.removeEventListener("message", rawMessageListener);
      rawMessageListener = null;
    }
  };
};