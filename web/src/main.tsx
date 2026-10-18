import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { installProblemReporting } from "./lib/problems";
import "./index.css";

installProblemReporting();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

// Offline support: cache the app shell so the site (including the bundled
// dictionary) keeps working with no connection after the first visit.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a progressive enhancement — ignore failures.
    });
  });
}
