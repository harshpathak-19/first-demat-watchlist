import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import Navbar from "./components/navbar/navBar";
import WatchlistPage from "./page/watchlistPage";
import Login from "./Login";
import Register from "./Register";
import StockDetailPage from "./Stockpage/StockDetailPage";

function ProtectedLayout() {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/watchlist" replace />
          ) : (
            <Navigate to="/register" replace />
          )
        }
      />

      <Route
        path="/register"
        element={token ? <Navigate to="/watchlist" replace /> : <Register />}
      />

      <Route
        path="/login"
        element={token ? <Navigate to="/watchlist" replace /> : <Login />}
      />

      <Route element={<ProtectedLayout />}>
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/stock/:stockId" element={<StockDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;