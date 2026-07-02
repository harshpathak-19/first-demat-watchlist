function Watchlist() {
  const stocks = [
    {
      symbol: "RELIANCE",
      name: "Reliance Industries",
      price: 2847.35,
      change: "-1.24%",
    },
    {
      symbol: "TCS",
      name: "Tata Consultancy",
      price: 3921.1,
      change: "-0.58%",
    },
    {
      symbol: "INFY",
      name: "Infosys Ltd",
      price: 1456.75,
      change: "+2.11%",
    },
    {
      symbol: "HDFCBANK",
      name: "HDFC Bank",
      price: 1789.25,
      change: "+0.87%",
    },
  ];

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">
        My Watchlist
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-4">Symbol</th>
              <th className="p-4">Companies</th>
              <th className="p-4">LTF</th>
              <th className="p-4">Stock</th>
            </tr>
          </thead>

          <tbody>
            {stocks.map((stock) => (
              <tr
                key={stock.symbol}
                className="border-t hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-4 font-semibold">
                  {stock.symbol}
                </td>

                <td className="p-4 text-gray-600">
                  {stock.name}
                </td>

                <td className="p-4">
                  {stock.price}
                </td>

                <td
                  className={`p-4 font-medium ${
                    stock.change.includes("+")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stock.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Watchlist;