import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import ThemeToggle from "./ThemeToggle";
import PlayerAvatar from "./PlayerAvatar";
import { championBackgroundUrl,championImageUrl,championShortName,championSubtitle } from "./championArtwork";
import { allCards, factionLabels } from "./data";
import { champions } from "./engine/champions";
import { cardsForDeck, makeMonoDeckDefinition } from "./engine/decks";
import { FactionCardBack } from "./FactionCardBack";
import { DEFAULT_PLAYER_NAME } from "./playerProfile";
import { SPECIAL_TEXT,specialKindFor } from "./engine/manifestations";
import type { AIDifficulty } from "./engine/types";
import type { SavedMatch } from "./persistence";
import type { CardDefinition, Faction } from "./types";
import "./front-office.css";
import "./onboarding-front.css";

type GoHome = () => void;
type ChampionPickerProps = {
  onBack: GoHome;
  onPlay: (championId: string, opponentId: string, difficulty: AIDifficulty) => void;
  onGallery: () => void;
  mode?:"standard"|"arcade"|"browse";
};

type GalleryProps = {
  onBack: GoHome;
  onPlay: () => void;
};

const factionInfo: {id: Faction; tagline: string; description: string; symbol: string; hint: string}[] = [
  {id:"red",tagline:"La fuerza del orden",description:"Encadená jugadas y prepará un gran remate en Diestra.",symbol:"",hint:"Ataque · Secuencias"},
  {id:"blue",tagline:"El arte de responder",description:"Cambiá el Poder rival, interrumpí habilidades y adaptate.",symbol:"",hint:"Control · Reacción"},
  {id:"white",tagline:"La memoria perdura",description:"Construí tus Archivos para ser más fuerte en rondas posteriores.",symbol:"◇",hint:"Archivo · Crecimiento"},
  {id:"saints",tagline:"La belleza de la simetría",description:"Buscá patrones, empates y combinaciones de posiciones.",symbol:"◈",hint:"Patrones · Equilibrio"},
  {id:"ivory",tagline:"El poder de la coincidencia",description:"Jugá en la misma posición que el rival para activar Augurio +3 en ese duelo.",symbol:"☾",hint:"Augurio · Posiciones"}
];

function Sprite({card, crop=false}: {card: CardDefinition; crop?: boolean}) {
  const ready = useCardArtReady(card);
  if (!card.art || !ready) {
    const faction = factionInfo.find(f=>f.id === card.faction)!;
    return (
      <div className={"library-placeholder theme-" + card.faction}>
        <span className="library-placeholder-orbit" aria-hidden="true">{faction.symbol}</span>
        <span className="library-placeholder-category">{factionLabels[card.faction]}</span>
        <strong>{card.name}</strong>
        <span className="library-placeholder-power">PODER {card.power}</span>
        <small>Ilustración provisional</small>
      </div>
    );
  }
  const style: CSSProperties = {
    backgroundImage: cardSpriteBackground(card),
    backgroundSize: "300% 200%",
    backgroundPosition: (card.art.column * 50) + "% " + (card.art.row * 100) + "%"
  };
  return <div className={crop ? "library-art-crop" : "library-card-image"}><div className="library-card-sprite" style={style} /></div>;
}

export function HomeScreen({
  onPlay,onTutorial,onGallery,onPhysical,onDeckLab,onMultiplayer,onPlaytest,onSettings,onArcade,onContinueArcade,arcadeResume,
  playerName,playerAvatar,onProfile,onChampions,onContinue,saved,
  analyticsReady,analyticsConsent,onChangeAnalytics
}: {
  onPlay:()=>void;onTutorial:()=>void;onGallery:()=>void;onPhysical:()=>void;onDeckLab:()=>void;
  onMultiplayer:()=>void;onPlaytest:()=>void;onSettings:()=>void;onArcade:()=>void;
  onContinueArcade:()=>void;arcadeResume:string|null;
  playerName:string;playerAvatar:string;onProfile:()=>void;onChampions:()=>void;
  onContinue:()=>void;saved:SavedMatch|null;
  analyticsReady:boolean;analyticsConsent:boolean;onChangeAnalytics:(value:boolean)=>void;
}) {
  const [selectedAction,setSelectedAction] = useState<string|null>(null);
  const pendingNavigation = useRef<number|null>(null);

  useEffect(() => () => {
    if (pendingNavigation.current !== null) window.clearTimeout(pendingNavigation.current);
  }, []);

  // Keep a pressed illustration visible on touch screens before navigation.
  const activate = (id:string, callback:()=>void) => {
    if (pendingNavigation.current !== null) return;
    setSelectedAction(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pendingNavigation.current = window.setTimeout(() => {
      pendingNavigation.current = null;
      callback();
    }, reduce ? 0 : 230);
  };

  const buttons = [
    ...(saved ? [{
      id:"continue", title:"CONTINUAR PARTIDA",
      subtitle:`${championShortName(saved.game.player.champion.name)} vs. ${championShortName(saved.game.opponent.champion.name)} · Ronda ${saved.game.round}`,
      image:"banner.webp", fallback:"./factions/saints-portrait.webp", action:onContinue
    }] : []),
    {id:"play", title:saved?"NUEVA PARTIDA":"JUGAR", subtitle:"Partida contra la IA", image:"dagger.webp", fallback:"./factions/red-portrait.webp", action:onPlay},
    ...(arcadeResume ? [{id:"arcade-continue",title:"CONTINUAR ARCADE",subtitle:arcadeResume,image:"banner.webp",fallback:"./factions/saints-portrait.webp",action:onContinueArcade}] : []),
    {id:"arcade", title:"ARCADE", subtitle:"Ocho rivales · Una racha",image:"banner.webp",fallback:"./factions/saints-portrait.webp",action:onArcade},
    {id:"learn", title:"APRENDER A JUGAR", subtitle:"Partida guiada", image:"egg.webp", fallback:"./factions/white-portrait.webp", action:onTutorial},
    {id:"decks", title:"MIS MAZOS", subtitle:"Crear y editar", image:"book.webp", fallback:"./factions/ivory-portrait.webp", action:onDeckLab},
    {id:"collection",title:"COLECCIÓN",subtitle:"Cartas y habilidades",image:"book.webp",fallback:"./factions/white-portrait.webp",action:onGallery}
  ];

  return (
    <main className="fo-shell home-screen solo-home">
      <header className="fo-topbar">
        <span className="fo-wordmark">
          <img src="./branding/menu/crown.svg" alt="" aria-hidden="true" className="menu-top-crown" />
          DAGGERLIGHT
        </span>
        <button type="button" className="dl-home-profile action-profile" onClick={onProfile} aria-label="Mi perfil">
          <PlayerAvatar id={playerAvatar}/>
          <span className="dl-home-profile-name"><strong>{playerName&&playerName!==DEFAULT_PLAYER_NAME?playerName:"MI PERFIL"}</strong><small>{playerName&&playerName!==DEFAULT_PLAYER_NAME?"MI PERFIL":"PERSONALIZAR"}</small></span>
        </button>
      </header>
      <div className="home-layout">
        <section className="home-hero" aria-label="Daggerlight">
          <div className="home-hero-copy">
            <img className="home-hero-crown" src="./branding/menu/crown.svg" alt="" aria-hidden="true" />
            <h1 className="home-title">DAGGERLIGHT</h1>
            <p className="home-tagline">La mano que elegís determina el poder que ejercés.</p>

          </div>
          <div className="home-hero-art" aria-hidden="true">
            <span className="hero-art-halo" />
            <img src="./branding/menu/splash-art.webp" alt="" onError={event => {
              if (!event.currentTarget.src.endsWith("/red-portrait.webp"))
                event.currentTarget.src="./factions/red-portrait.webp";
            }} />
          </div>
        </section>
        <nav className="home-actions" aria-label="Menú principal">
          {buttons.map(button => (
            <button
              key={button.id}
              type="button"
              className={"home-action action-" + button.id + (selectedAction === button.id ? " is-selected" : "")}
              onClick={() => activate(button.id,button.action)}
            >
              <span className="home-action-content">
                <strong>{button.title}</strong>
                <span className="home-action-description">{button.subtitle}</span>
              </span>
              <span className="home-action-reveal-ring" aria-hidden="true" />
              <img className="home-action-art" src={"./branding/menu/" + button.image} alt="" aria-hidden="true" onError={event => {
                if (!event.currentTarget.src.endsWith(button.fallback.split("/").at(-1)!))
                  event.currentTarget.src = button.fallback;
              }} />
              <span className="home-action-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
          <div className="home-menu-support">
            <a className="home-physical-link" href="./reglamento.html" target="_blank" rel="noopener noreferrer">REGLAMENTO</a>
            <button type="button" className="home-physical-link" onClick={onChampions}>VER CAMPEONES</button>
            <button type="button" className="home-physical-link" onClick={onSettings}>CONFIGURACIÓN</button>
          </div>
        </nav>
      </div>
      <footer className="fo-footer menu-footer">
        <details className="home-more-options">
          <summary>Más opciones</summary>
          <div className="menu-extras">
            <button type="button" className="home-physical-link" onClick={onMultiplayer}>MULTIJUGADOR · BETA</button>
            <button type="button" className="home-physical-link" onClick={onPlaytest}>PLAYTEST</button>
            <button type="button" className="home-physical-link" onClick={onPhysical}>MODO MESA · BETA</button>
            {import.meta.env.VITE_DAGGERLIGHT_LAB==="true" && <a className="home-physical-link lab-classic-link" href="../gameplay-v1/">VOLVER AL JUEGO CLÁSICO</a>}
          </div>
          <div className="home-more-preferences">
            <ThemeToggle />
            {analyticsReady ? <label className="home-analytics-consent">
              <input type="checkbox" checked={analyticsConsent} onChange={event=>onChangeAnalytics(event.target.checked)} />
              Compartir estadísticas anónimas
            </label> : <span className="menu-local-stats">ESTADÍSTICAS LOCALES</span>}
          </div>
        </details>
      </footer>
    </main>
  );
}

function StarterDeckPreview({championId,faction}:{championId:string;faction:Faction}) {
  const cards=cardsForDeck(makeMonoDeckDefinition(championId));
  const roster=new Map<CardDefinition,number>();
  for (const card of cards) roster.set(card,(roster.get(card)??0)+1);

  return <section className="dl-starter-deck" aria-label="Mazo inicial">
    <div className="dl-starter-deck-summary">
      <FactionCardBack faction={faction} className="dl-starter-deck-back"/>
      <div>
        <h2>MAZO INICIAL</h2>
        <p className="dl-starter-deck-faction">{factionLabels[faction]}</p>
        <p>{cards.length} cartas · {roster.size} distintas</p>
      </div>
    </div>
    <details className="dl-starter-deck-list">
      <summary>Ver las cartas del mazo</summary>
      <ul>
        {Array.from(roster,([card,copies])=><li key={card.id}>
          <span>{copies}×</span><strong>{card.name}</strong><span>{card.power} P</span>
        </li>)}
      </ul>
    </details>
  </section>;
}

export function ChampionPicker({onBack,onPlay,onGallery,mode="standard"}:ChampionPickerProps) {
  const arcade=mode==="arcade";
  const browse=mode==="browse";
  const [faction,setFaction]=useState<Faction>("red");
  const [selected,setSelected]=useState<string|null>(null);
  const [opponent,setOpponent]=useState("random");
  const [difficulty,setDifficulty]=useState<AIDifficulty>("easy");
  const activeChampions=Object.values(champions).filter(c=>c.faction===faction);
  const chosen=selected?champions[selected]:null;

  function chooseFaction(next:Faction) {
    if(next===faction) return;
    setFaction(next);
    setSelected(null);
  }

  return (
    <main className="fo-shell picker-screen dl-picker">
      <header className="fo-topbar">
        <button type="button" className="fo-back" onClick={chosen?()=>setSelected(null):onBack}>{chosen?"← CAMPEONES":"← INICIO"}</button>
        <span className="fo-wordmark"><img className="menu-top-crown" src="./branding/menu/crown.svg" alt="" aria-hidden="true" /> DAGGERLIGHT</span>
        <div className="fo-header-actions">
          <button type="button" className="fo-text-button" onClick={onGallery}>VER CARTAS</button>
          <ThemeToggle />
        </div>
      </header>

      <section className="dl-picker-header">
        <h1>{browse?"CAMPEONES":chosen?(arcade?"PREPARÁ TU ARCADE":"PREPARÁ TU PARTIDA"):(arcade?"ARCADE · ELEGÍ TU CAMPEÓN":"ELEGÍ TU CAMPEÓN")}</h1>
        {arcade && <p className="arcade-picker-intro">UN CAMPEÓN · OCHO RIVALES · SEGUÍ HASTA PERDER</p>}
      </section>

      {!chosen && <nav className="dl-faction-switcher" aria-label="Elegí una facción">
        {factionInfo.map(f=>(
          <button type="button" key={f.id}
            className={"dl-faction-tab"+(faction===f.id?" active":"")}
            aria-pressed={faction===f.id}
            onClick={()=>chooseFaction(f.id)}>
            <span>{factionLabels[f.id]}</span>
          </button>
        ))}
      </nav>}

      <section className="dl-champion-content" aria-label={"Campeones de "+factionLabels[faction]}>
        {!chosen && <div className="dl-champion-grid">
          {activeChampions.map(c=>(
            <button type="button" key={c.id}
              className={"dl-champion-card"+(selected===c.id?" is-selected":"")}
              aria-pressed={selected===c.id}
              aria-label={championShortName(c.name)+". "+c.text}
              onClick={()=>{setSelected(c.id);window.scrollTo(0,0);}}>
              <span className="dl-champion-art"
                style={{backgroundImage:`url("${championBackgroundUrl(c.faction)}")`}}>
                <img src={championImageUrl(c.id)} alt="" loading="lazy" decoding="async"/>
              </span>
              <span className="dl-champion-panel">
                <strong>{championShortName(c.name)}</strong>
                {championSubtitle(c.name)&&<span className="dl-champion-subtitle">{championSubtitle(c.name)}</span>}
                <span className="dl-champion-ability">{c.text}</span>
              </span>
              {selected===c.id&&<span className="dl-champion-selected" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>}
        {chosen&&(
          <div className="dl-champion-confirm">
            <div className="dl-champion-card dl-champion-confirm-preview" data-faction={chosen.faction}>
              <span className="dl-champion-art"
                style={{backgroundImage:`url("${championBackgroundUrl(chosen.faction)}")`}}>
                <img src={championImageUrl(chosen.id)} alt="" decoding="async"/>
              </span>
              <span className="dl-champion-panel">
                <strong>{championShortName(chosen.name)}</strong>
                {championSubtitle(chosen.name)&&<span className="dl-champion-subtitle">{championSubtitle(chosen.name)}</span>}
                <span className="dl-champion-ability">{chosen.text}</span>
              </span>
            </div>
            <div className="dl-champion-confirm-panel">
              <div className="dl-champion-settings">
            {!arcade && !browse && <label>
              <span>RIVAL</span>
              <select value={opponent} onChange={e=>setOpponent(e.target.value)}>
                <option value="random">ALEATORIO</option>
                {Object.values(champions).map(c=>
                  <option key={c.id} value={c.id}>{championShortName(c.name).toUpperCase()}</option>
                )}
              </select>
            </label>}
            {!browse && <label>
              <span>DIFICULTAD</span>
              <select value={difficulty} onChange={e=>setDifficulty(e.target.value as AIDifficulty)}>
                <option value="easy">NORMAL</option>
                <option value="normal">DIFÍCIL</option>
              </select>
            </label>}
            <button type="button" className="dl-champion-start"
              onClick={()=>onPlay(chosen.id,opponent,difficulty)}>
              {browse?"ELEGIR MAZO":arcade?"INICIAR ARCADE · 8 RIVALES":"EMPEZAR PARTIDA"} <span aria-hidden="true">↗</span>
            </button>
              </div>
              <StarterDeckPreview championId={chosen.id} faction={chosen.faction}/>
              <button type="button" className="dl-champion-change" onClick={()=>setSelected(null)}>{browse?"← VER CAMPEONES":"← CAMBIAR CAMPEÓN"}</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export function CardCollection({onBack,onPlay}:GalleryProps) {
  const [faction,setFaction] = useState<Faction | "all">("all");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState<CardDefinition | null>(null);
  const [view,setView] = useState<"art" | "card">("art");
  const filtered=useMemo(()=>allCards.filter(c=>
    (faction==="all" || c.faction===faction) &&
    (c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) || c.studioId.toLowerCase().includes(query.trim().toLowerCase()))
  ),[faction,query]);
  return (
    <main className="fo-shell library-screen">
      <header className="fo-topbar">
        <button className="fo-back" type="button" onClick={onBack}>← INICIO</button>
        <span className="fo-wordmark"><img className="menu-top-crown" src="./branding/menu/crown.svg" alt="" aria-hidden="true" /> DAGGERLIGHT</span>
        <div className="fo-header-actions"><button type="button" className="fo-text-button" onClick={onPlay}>JUGAR ↗</button><ThemeToggle /></div>
      </header>
      <section className="fo-intro library-intro">
        <span className="fo-eyebrow">ARCHIVO DE LA QUIRALIDAD</span>
        <h1>La colección</h1>
        <p>Explorá los {allCards.length} diseños del juego. Tocá una carta para verla en detalle y leer su habilidad.</p>
      </section>
      <div className="library-toolbar">
        <div className="library-faction-filters" role="group" aria-label="Filtrar cartas por facción">
          <button type="button" className={faction==="all"?"current":""} onClick={()=>setFaction("all")} aria-pressed={faction==="all"}>TODAS</button>
          {factionInfo.map(f=><button type="button" key={f.id} className={(faction===f.id?"current ":"")+"theme-"+f.id} onClick={()=>setFaction(f.id)} aria-pressed={faction===f.id}>{factionLabels[f.id]}</button>)}
        </div>
        <label className="library-search"><span className="sr-only">Buscar carta por nombre o ID</span><span aria-hidden="true">⌕</span><input placeholder="Buscar una carta..." value={query} onChange={e=>setQuery(e.target.value)} type="search" /></label>
      </div>
      <div className="library-result-heading"><strong>{filtered.length} {filtered.length===1?"CARTA":"CARTAS"}</strong></div>
      {filtered.length===0 ? <div className="library-empty">No se encontraron cartas con ese filtro. Probá con otro nombre.</div> : <section className="library-grid" aria-label="Cartas">
        {filtered.map(card=><button type="button" key={card.studioId} className={"library-card-tile theme-"+card.faction} onClick={()=>{setSelected(card);setView("art");}} aria-label={"Ver "+card.name}>
          <div className="library-tile-art"><Sprite card={card} crop={!!card.art}/></div>
          <div className="library-tile-text"><span className="library-tile-id">{card.studioId} <b>{card.power} P</b></span><strong>{card.name}</strong>{card.trait && <small className="library-token-keyword">{card.trait.toUpperCase()}</small>}<span>{factionLabels[card.faction]}</span></div>
        </button>)}
      </section>}
      
      {selected && <div className="library-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
        <section className={"library-modal theme-"+selected.faction} role="dialog" aria-modal="true" aria-label={"Detalle de "+selected.name}>
          <button type="button" className="library-modal-close" onClick={()=>setSelected(null)} aria-label="Cerrar detalle de carta">×</button>
          <div className="library-detail-media">
            {selected.art && <div className="library-view-toggle" role="group" aria-label="Vista de carta">
              <button type="button" aria-pressed={view==="art"} className={view==="art"?"active":""} onClick={()=>setView("art")}>ILUSTRACIÓN</button>
              <button type="button" aria-pressed={view==="card"} className={view==="card"?"active":""} onClick={()=>setView("card")}>CARTA</button>
            </div>}
            <div className={"library-detail-image "+(view==="art"?"is-art":"is-card")}>
              <Sprite card={selected} crop={view==="art" && !!selected.art}/>
            </div>
          </div>
          <div className="library-detail-copy">
            <span className="fo-eyebrow">{factionLabels[selected.faction]} / {selected.studioId}</span>
            <h2>{selected.name}</h2>
            <div className="library-detail-tags"><span>PODER <b>{selected.power}</b></span><span>{selected.affinity ? "AFINIDAD: "+selected.affinity.toUpperCase() : "SIN AFINIDAD POSICIONAL"}</span></div>
            <span className="library-ability-heading">HABILIDAD</span>
            <p>{selected.text}</p>
             {specialKindFor(selected) && <p className="library-special-rule">
               <strong>{selected.trait?.toUpperCase()}</strong> · {SPECIAL_TEXT[specialKindFor(selected)!]}
             </p>}
            {!selected.art && <div className="library-art-note">Esta carta todavía no tiene ilustración final. La ficha muestra su diseño mecánico vigente.</div>}
            
            <div className="library-modal-nav">
              <button type="button" onClick={()=>{const i=filtered.findIndex(c=>c.studioId===selected.studioId);setSelected(filtered[(i-1+filtered.length)%filtered.length]);setView("art");}}>← ANTERIOR</button>
              <button type="button" onClick={()=>{const i=filtered.findIndex(c=>c.studioId===selected.studioId);setSelected(filtered[(i+1)%filtered.length]);setView("art");}}>SIGUIENTE →</button>
            </div>
          </div>
        </section>
      </div>}
    </main>
  );
}
