import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react() , tailwindcss()],

  server: {
    proxy: {
      "/api": {
        target: "https://watchlist-tdin.onrender.com/api",
        changeOrigin: true,
        secure: false,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      },
    },
  },
});