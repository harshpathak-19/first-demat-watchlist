import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function LivePriceChart({ symbol = "Stock", data = [], socketStatus = "idle" }) {
  const isConnected = socketStatus === "connected";

  const hasData = data.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {symbol} live chart
          </h3>

          <p className="text-xs text-gray-400 mt-1">
            Live price updates via WebSocket
          </p>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            isConnected
              ? "bg-green-50 text-green-600"
              : socketStatus === "connecting"
              ? "bg-yellow-50 text-yellow-600"
              : socketStatus === "error"
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isConnected
            ? "Live Connected"
            : socketStatus === "connecting"
            ? "Connecting"
            : socketStatus === "error"
            ? "Live Error"
            : "Waiting"}
        </span>
      </div>

      <div className="h-72 rounded-xl bg-gray-50 border border-dashed border-gray-300 p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Graph Area</p>

              <p className="text-xs text-gray-400 mt-1">
                LTP updates from WebSocket will be shown here
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>{data.length} live points</span>
        <span>Updates in real time</span>
      </div>
    </div>
  );
}

export default LivePriceChart;