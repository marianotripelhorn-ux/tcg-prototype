import { championBackgroundUrl, championImageUrl } from "./championArtwork";
import "./welcome-match.css";

const base=import.meta.env.BASE_URL;

export function WelcomeMatch({onPlay,onSkip}:{onPlay:()=>void;onSkip:()=>void}){
  return <main className="fo-shell dl-welcome">
    <header className="fo-topbar">
      <span className="fo-wordmark"><img src={base+"branding/menu/crown.svg"} className="menu-top-crown" alt=""/>DAGGERLIGHT</span>
    </header>
    <section className="dl-welcome-main" aria-labelledby="welcome-title">
      <div className="dl-welcome-copy">
        <h1 id="welcome-title">Jugá tu primer duelo</h1>
        <p>Elegí una carta, ubicála en el tablero y descubrí cómo cambia su Poder. Te acompañamos durante la primera ronda.</p>
        <div className="dl-welcome-actions">
          <button type="button" className="primary-button" onClick={onPlay}>EMPEZAR PARTIDA GUIADA</button>
          <button type="button" className="secondary-button" onClick={onSkip}>SALTAR TUTORIAL</button>
        </div>
      </div>
      <div className="dl-welcome-art" aria-hidden="true">
        <img className="dl-welcome-fabric" src={championBackgroundUrl("red")} alt=""/>
        <img className="dl-welcome-champion" src={championImageUrl("dextral")} alt=""/>
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
