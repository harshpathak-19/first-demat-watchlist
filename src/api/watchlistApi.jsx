import { useState, useEffect } from "react";
import Watchlist from "../components/Watchlist/watchlist";

function Stock() {
  const API = "https://palace-backshift-undress.ngrok-free.dev/api/stocks"; 

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch(API, {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        console.log("API Result:", result);

        setStocks(result.data || []);
      } catch (error) {
        console.error("Error fetching stocks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return <Watchlist stocks={stocks} loading={loading} />;
}

export default Stock;