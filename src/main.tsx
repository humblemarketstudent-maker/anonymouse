import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { backend } from "@/backend";
import "./index.css";

backend.startLive();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
