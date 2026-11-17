import React, { Suspense } from "react";
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
import "./arena-interaction-fix.css";
import "./board-redesign/board.css";
import "./board-redesign/motion.css";
import "./board-redesign/gold-shadow.css";
import "./board-redesign/refinement-v2.css";
import "./board-redesign/refinement-v3.css";
import "./board-redesign/duel-choreography.css";
import "./board-redesign/duel-presentation-v1-1.css";
import "./board-redesign/round-archive-v1.css";
import "./board-redesign/round-archive-sweep-v2.css";
import "./board-redesign/round-shadow-sweep-v3.css";
import "./board-redesign/quiero-choreography.css";
import "./board-redesign/ivory-materials.css";
import "./board-redesign/ivory-layout.css";
import "./board-redesign/ivory-mobile.css";
import "./animation-lab/lab.css";
import "./animation-lab/chiral.css";
import "./animation-lab/spectral-v3.css";
import "./animation-lab/v4-motion.css";
import "./animation-lab/v5-motion.css";

initializeTheme();

const isAnimationLab = new URLSearchParams(window.location.search).get("lab") === "animations";
const AnimationLab = React.lazy(() => import("./animation-lab/AnimationLab"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAnimationLab ? <Suspense fallback={<div className="lab-boot">Preparando el laboratorio de animaciones…</div>}><AnimationLab /></Suspense> : <App />}
  </React.StrictMode>
);
