import { useNavigate } from "react-router-dom";
import { logoutUser } from "../../Apii/authApi";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        <span className="text-base font-bold text-gray-900">First Demat</span>
      </div>

      {/* Nav Links */}
      <ul className="flex items-center gap-8 list-none m-0 p-0">
        <li>
          <a
            href="#watchlist"
            className="text-md text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Watchlist
          </a>
        </li>

        <li>
          <a
            href="#portfolio"
            className="text-md text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Portfolio
          </a>
        </li>

        <li>
          <a
            href="#orders"
            className="text-md text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Orders
          </a>
        </li>

        <li>
          <a
            href="#reports"
            className="text-md text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Reports
          </a>
        </li>
      </ul>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
          Market Open
        </span>

        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 cursor-pointer">
          H
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;