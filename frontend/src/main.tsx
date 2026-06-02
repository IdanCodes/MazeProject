import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppNetworkConfigWrapper from "./App";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AppNetworkConfigWrapper />
    </HashRouter>
  </StrictMode>,
);
