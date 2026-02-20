import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import "./i18n";
import { Suspense } from "react";

import SplashScreen from "@/components/SplashScreen";

// Self-healing: detect stale service worker serving old asset hashes.
// When a SW caches an old index.html and a new deployment changes chunk
// filenames, the browser gets 404s for JS files. We detect this by
// checking if any script on the page failed to load, then unregister
// all SWs and reload once to get fresh content.
if ("serviceWorker" in navigator) {
  window.addEventListener("error", (e) => {
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLScriptElement &&
      target.src?.includes("/assets/")
    ) {
      console.warn("[SW] Asset 404 detected — unregistering stale service worker and reloading…");
      navigator.serviceWorker.getRegistrations().then((regs) => {
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          // Guard against infinite reload loops
          if (!sessionStorage.getItem("sw-reload-attempted")) {
            sessionStorage.setItem("sw-reload-attempted", "1");
            window.location.reload();
          }
        });
      });
    }
  }, true /* capture phase to catch script errors before they bubble */);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<SplashScreen />}>
      <App />
    </Suspense>
    <Toaster />
  </React.StrictMode>,
);
