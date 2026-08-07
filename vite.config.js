import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server/index.js";

const _dirname = path.dirname(new URL(import.meta.url).pathname);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    allowedHosts: [
      "all",
      "37d4-197-211-52-73.ngrok-free.app", // 👈 add your ngrok subdomain here
    ],
    //host: "::",
    port: 8080,
    fs: {
      allow: [
        path.resolve(_dirname, "client"),
        path.resolve(_dirname, "shared"),
        path.resolve(__dirname, ".."),
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
}));

function expressPlugin() {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();
      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
