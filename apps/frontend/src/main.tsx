import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rootDom = document.getElementById("root");
if (!rootDom) {
  throw new Error("Failed to find root element");
}

const queryClient = new QueryClient();

const root = createRoot(rootDom);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
