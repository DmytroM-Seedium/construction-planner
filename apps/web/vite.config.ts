import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const monorepoRoot = fileURLToPath(new URL("../..", import.meta.url));
const envFilePath = path.resolve(webRoot, ".env");

dotenv.config({ path: envFilePath });

const publicEnv = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "http://localhost:4000"
};

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_ENV__: JSON.stringify(publicEnv)
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    },
    dedupe: ["react", "react-dom"]
  },
  server: {
    port: 5173,
    fs: {
      allow: [webRoot, monorepoRoot]
    }
  }
});
