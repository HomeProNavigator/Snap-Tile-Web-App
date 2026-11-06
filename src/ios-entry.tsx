import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SnapApp } from "./snaptile/screens";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SnapApp />
    </StrictMode>,
  );
}
