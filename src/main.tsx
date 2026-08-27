import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KingsideApp } from "@/components/chess/kingside-app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KingsideApp />
  </StrictMode>,
);