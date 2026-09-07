import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

console.log("Vellum: main.tsx starting...");

// Global error handler for Tauri debugging
window.onerror = (msg, url, line, col, error) => {
  const errorMsg = `Error: ${msg}\nAt: ${url}:${line}:${col}`;
  console.error(errorMsg);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: #ff5555; font-family: sans-serif; background: #242424; height: 100vh;">
      <h3>Runtime Error during Boot</h3>
      <pre style="white-space: pre-wrap; background: #1a1a1a; padding: 10px; border-radius: 4px;">${errorMsg}</pre>
      <p>Check the console for more details.</p>
    </div>`;
  }
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find root element");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
  console.log("Vellum: React mount initiated");
}
