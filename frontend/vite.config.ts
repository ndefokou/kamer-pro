import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8082",
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
        configure: (proxy: any, _options: any) => {
          proxy.on('error', (err: any, _req: any, _res: any) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
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
      registerType: "prompt", // Changed from autoUpdate to prompt for more control
      devOptions: {
        enabled: true,
      },
      includeAssets: ["logo.png", "favicon.ico", "apple-touch-icon.png", "masked-icon.svg", "screenshot-desktop.png", "screenshot-mobile.png"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // IMPORTANT: Do NOT precache JS or CSS — they have content-hash names
        // so the browser cache handles them natively. Precaching JS leads to
        // stale bundles being served from the SW cache after new deployments.
        globPatterns: ['**/*.{html,ico,png,svg,webp,jpg,jpeg,webmanifest}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Never cache backend API calls or Supabase requests
            urlPattern: ({ url }) => {
              const isPathApi = url.pathname.includes('/api/') || url.pathname.endsWith('/api');
              const isKnownBackend =
                url.hostname.includes('camer.digital') || url.hostname.includes('supabase.co');
              return isPathApi || isKnownBackend;
            },
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
        navigateFallbackDenylist: [/\/api(\/|$)/, /supabase\.co/, /camer\.digital/],
        directoryIndex: '/',
      },
      manifest: {
        name: "leMboko",
        short_name: "leMboko",
        description: "Connect with buyers and sellers in Yaoundé, Cameroon. Browse products, list items, and discover local deals on Le Mboko marketplace.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
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
        // Prevent Rollup from inlining small chunks as data:application/octet-stream URIs,
        // which browsers reject as ES module scripts (strict MIME type checking).
        inlineDynamicImports: false,
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-ui': [
            '@radix-ui/react-slot',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-accordion',
            '@radix-ui/react-popover',
          ],
          'ui-components': ['class-variance-authority', 'clsx', 'tailwind-merge'],
          'tanstack': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'map': ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: true,
    sourcemap: false,
    // esbuild is Vite's built-in minifier and handles complex re-exports
    // more reliably than terser in this project.
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
