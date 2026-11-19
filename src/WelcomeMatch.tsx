import type { CSSProperties } from "react";
import { cardSpriteBackground } from "./cardArtwork";
import { championBackgroundUrl } from "./championArtwork";
import { byId } from "./data";
import ThemeToggle from "./ThemeToggle";
import "./welcome-match.css";

const base = import.meta.env.BASE_URL;
const welcomeCard = byId("invocadagas");
const cardArt = welcomeCard.art;
const cardStyle = cardArt && {
  backgroundImage: cardSpriteBackground(welcomeCard),
  backgroundPosition: `${cardArt.column * 50}% ${cardArt.row * 100}%`,
};

export function WelcomeMatch({
  playerName, onNameChange, onPlay, onSkip,
}: {
  playerName: string;
  onNameChange: (name: string) => void;
  onPlay: () => void;
  onSkip: () => void;
}) {
  return <main className="dl-welcome">
    <header className="dl-welcome-topbar">
      <span className="dl-welcome-wordmark">
        <img src={base + "branding/menu/crown.svg"} alt="" />
        DAGGERLIGHT
      </span>
      <ThemeToggle />
    </header>
    <section className="dl-welcome-main" aria-labelledby="welcome-title">
      <div className="dl-welcome-copy">
        <h1 id="welcome-title">Jugá tu primer duelo</h1>
        <p>Elegí una carta, ubicála en el tablero y descubrí cómo cambia su Poder. Te acompañamos durante la primera ronda.</p>
        <form onSubmit={event => { event.preventDefault(); onPlay(); }}>
          <label className="dl-welcome-name" htmlFor="welcome-player-name">Tu nombre de jugador</label>
          <input
            className="dl-welcome-input"
            id="welcome-player-name"
            value={playerName}
            onChange={event => onNameChange(event.currentTarget.value)}
            placeholder="¿Cómo te llamás?"
            maxLength={20}
            autoComplete="nickname"
          />
          <div className="dl-welcome-actions">
            <button type="submit" className="primary-button">EMPEZAR PARTIDA GUIADA</button>
            <button type="button" className="secondary-button" onClick={onSkip}>SALTAR TUTORIAL</button>
          </div>
        </form>
      </div>
      <div className="dl-welcome-art"
        style={{ "--dl-welcome-fabric": `url("${championBackgroundUrl("red")}")` } as CSSProperties}
      >
        <div className="dl-welcome-card" style={cardStyle} role="img" aria-label={welcomeCard.name} />
      </div>
    </section>
  </main>;
}

export function OpeningGuide({message,onSkip}:{message:string;onSkip:()=>void}){
  return <aside className="dl-opening-guide" aria-label="Guía de la primera ronda">
    <p role="status">{message}</p>
    <button type="button" onClick={onSkip}>Saltar guía</button>
  </aside>;
}
