import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import type { OceanHost } from "./lib/api";

declare global {
  interface Window {
    /** set by qollab/config.js before this bundle runs: wait for the host */
    groverOceanHostPending?: boolean;
    /** qollab/main.js calls this once Qiskit is connected */
    groverOceanAttachHost?: (host: OceanHost) => void;
  }
}

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

if (typeof window !== "undefined" && window.groverOceanHostPending) {
  // On Qollab the game must not start until the in-page Qiskit host exists.
  window.groverOceanAttachHost = (host) => {
    window.groverOceanHost = host;
    mount();
  };
} else {
  mount();
}
