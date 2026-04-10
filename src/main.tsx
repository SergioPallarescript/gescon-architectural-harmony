import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before React renders to prevent flash
const saved = localStorage.getItem("theme_preference");
if (saved === "dark") {
  document.documentElement.classList.add("dark");
}

// Match pre-paint background to system preference (before React)
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.body.style.background = prefersDark ? "#141414" : "#ffffff";

createRoot(document.getElementById("root")!).render(<App />);
