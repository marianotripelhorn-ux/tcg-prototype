import type { CSSProperties } from "react";
import { cardSpriteBackground } from "./cardArtwork";
import { championBackgroundUrl } from "./championArtwork";
import { byId } from "./data";
import ThemeToggle from "./ThemeToggle";
import PlayerAvatar from "./PlayerAvatar";
import { avatarCards } from "./playerAvatar";
import { DEFAULT_PLAYER_NAME } from "./playerProfile";
import "./welcome-match.css";

const base = import.meta.env.BASE_URL;
const welcomeCard = byId("invocadagas");
const cardArt = welcomeCard.art;
const cardStyle = cardArt && {
  backgroundImage: cardSpriteBackground(welcomeCard),
  backgroundPosition: `${cardArt.column * 50}% ${cardArt.row * 100}%`,
};

export function WelcomeMatch({
  playerName, onNameChange, playerAvatar, onAvatarChange, onPlay, onSkip,
}: {
  playerName: string;
  playerAvatar:string;
  onAvatarChange:(id:string)=>void;
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
        <h1 id="welcome-title">CREÁ TU PERFIL</h1>
        
        <form onSubmit={event => { event.preventDefault(); onPlay(); }}>
          <label className="dl-welcome-name" htmlFor="welcome-player-name">Tu nombre de jugador</label>
          <input
            className="dl-welcome-input"
            id="welcome-player-name"
            value={playerName===DEFAULT_PLAYER_NAME?"":playerName}
            onChange={event => onNameChange(event.currentTarget.value)}
            maxLength={20}
            autoComplete="nickname"
          />
          <section className="dl-avatar-picker-section dl-welcome-avatars" aria-label="Elegir avatar">
            <span className="dl-avatar-picker-label">AVATAR</span>
            <div className="dl-avatar-picker">{avatarCards.map(card=><button key={card.id} type="button" title={card.name} aria-label={card.name} aria-pressed={playerAvatar===card.id} onClick={()=>onAvatarChange(card.id)}><PlayerAvatar id={card.id}/></button>)}</div>
          </section>
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
