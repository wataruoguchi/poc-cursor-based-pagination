import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const rootDom = document.getElementById("root");
if (!rootDom) {
  throw new Error("Failed to find root element");
}
const root = createRoot(rootDom);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
