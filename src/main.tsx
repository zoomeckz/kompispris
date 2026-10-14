import { createRoot } from "react-dom/client";
import App from "./App";
import { langReady } from "./i18n";
import "./index.css";

// wait for the saved language (a small download unless it is Swedish) so the app never flashes in Swedish first
langReady.then(() => createRoot(document.getElementById("root")!).render(<App />));
