import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppNetworkConfigWrapper from "./App";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppNetworkConfigWrapper />
    </BrowserRouter>
  </StrictMode>,
);
