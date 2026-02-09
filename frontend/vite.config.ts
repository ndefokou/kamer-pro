import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/kamer-pro/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8082",
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["logo.png", "favicon.ico", "apple-touch-icon.png", "masked-icon.svg", "screenshot-desktop.png", "screenshot-mobile.png"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,webmanifest}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
            options: {
              fetchOptions: {
                cache: 'no-store',
              } as unknown as RequestInit,
            },
          },
          {
            // Cache images with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              fetchOptions: {
                cache: 'no-store',
              } as unknown as RequestInit,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              fetchOptions: {
                cache: 'no-store',
              } as unknown as RequestInit,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: "leMboko",
        short_name: "leMboko",
        description: "Connect with buyers and sellers in Yaoundé, Cameroon. Browse products, list items, and discover local deals on Le Mboko marketplace.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "logo.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "logo.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshot-desktop.png",
            sizes: "1024x1024",
            type: "image/png",
            form_factor: "wide",
            label: "Desktop view of leMboko",
          },
          {
            src: "screenshot-mobile.png",
            sizes: "1024x1024",
            type: "image/png",
            form_factor: "narrow",
            label: "Mobile view of leMboko",
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-accordion', '@radix-ui/react-dialog', 'lucide-react', 'sonner'],
          'vendor-utils': ['axios', 'date-fns', 'i18next', 'zod'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
