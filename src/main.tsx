import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeTheme } from "./theme";
import "./styles.css";
import "./light-theme.css";
import "./brand-theme.css";
import "./dark-mode.css";
import "./gameplay-experiment.css";
import "./faction-art.css";
import "./persistence.css";
import "./immersive-menu.css";
import "./bold-ui.css";
import "./ui-polish-v3.css";
import "./champion-v4.css";
import "./site-polish-v4.css";
import "./playtest-pvp.css";
import "./manifestations.css";
import "./manifest-card-ui.css";
import "./arena-v2.css";
import "./arena-v2-overrides.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
