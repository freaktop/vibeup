import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "VibeUp",
        short_name: "VibeUp",
        description: "VibeUp Mobile App",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#FF6B9D",
        icons: [
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
    https: false,
    headers: {
      // No COOP in dev - COOP blocks Firebase popup's window.closed/close calls
      // (prod uses same-origin-allow-popups in vercel.json / netlify.toml)
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1800,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('mapbox-gl')) {
            return 'mapbox';
          }

          if (id.includes('/firebase/')) {
            return 'firebase';
          }

          if (id.includes('@capacitor/') || id.includes('@revenuecat/')) {
            return 'mobile-plugins';
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
