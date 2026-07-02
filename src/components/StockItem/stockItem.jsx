function StockItem({ stock, isSelected = false, onClick }) {
  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "₹0.00";
    }

    return `₹${Number(price).toFixed(2)}`;
  };

  return (
    <div
      onClick={onClick}
      className={`px-5 py-3.5 cursor-pointer border-b border-gray-100 transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">
        {stock?.symbol || "N/A"}
      </p>

      <p className="text-xs text-gray-400">
        {stock?.company_name || stock?.name || "No company name"}
      </p>

      <p className="text-xs text-gray-500">
        {formatPrice(stock?.ltp || stock?.price)}
      </p>
    </div>
  );
}

export default StockItem;