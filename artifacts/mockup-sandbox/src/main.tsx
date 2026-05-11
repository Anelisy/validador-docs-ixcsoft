import { createRoot } from "react-dom/client";
import "./lib/mock-fetch"; // Ativa o interceptor de fetch antes de tudo
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
