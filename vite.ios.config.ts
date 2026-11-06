import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static build of the same Buildlings screens. Windows and Mac both run this.
// The iPhone app loads the folder it writes (dist-ios). No server is inside TestFlight.
export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist-ios",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "ios-index.html"),
    },
  },
});
