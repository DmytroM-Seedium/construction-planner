import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const monorepoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react()],
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
