import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import "./i18n";
import { Suspense } from "react";

import SplashScreen from "@/components/SplashScreen";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<SplashScreen />}>
      <App />
    </Suspense>
    <Toaster />
  </React.StrictMode>,
);
