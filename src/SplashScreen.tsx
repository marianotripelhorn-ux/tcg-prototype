import { useEffect, useRef, useState } from "react";

/**
 * An entry layer, not a game state: opening the site shows the introduction,
 * while returning from a match takes players straight to the main menu.
 */
export default function SplashScreen({ onStart }: { onStart: () => void }) {
  const [entering, setEntering] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const begin = () => {
    if (entering) return;
    setEntering(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(onStart, reducedMotion ? 0 : 590);
  };

  return (
    <main className={"dagger-splash" + (entering ? " is-entering" : "")} aria-label="Bienvenido a Daggerlight">
      <div className="splash-vignette" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-one" aria-hidden="true" />
      <div className="splash-orbit splash-orbit-two" aria-hidden="true" />
      <div className="splash-stage">
        <div className="splash-art" aria-hidden="true">
          <img
            src="./branding/menu/splash-art.webp"
            alt=""
            onError={event => {
              if (!event.currentTarget.src.endsWith("/red-portrait.webp"))
                event.currentTarget.src = "./factions/red-portrait.webp";
            }}
          />
        </div>
        <div className="splash-copy">
          <img className="splash-crown" src="./branding/menu/crown.svg" alt="" aria-hidden="true" />
          <span className="splash-title-rule" aria-hidden="true" />
          <h1>DAGGERLIGHT</h1>
          <span className="splash-subtitle">TRADING CARD GAME</span>
          <button type="button" className="splash-start" onClick={begin} disabled={entering}>
            <span>EMPEZAR</span>
            <span className="splash-start-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      <span className="splash-edition">EL MUNDO DE LA QUIRALIDAD</span>
    </main>
  );
}
