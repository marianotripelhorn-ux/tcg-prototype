import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import ThemeToggle from "./ThemeToggle";
import { factionArtUrl } from "./factionArtwork";
import { allCards, factionLabels } from "./data";
import { champions } from "./engine/champions";
import type { AIDifficulty } from "./engine/types";
import type { SavedMatch } from "./persistence";
import type { CardDefinition, Faction } from "./types";
import "./front-office.css";

type GoHome = () => void;
type ChampionPickerProps = {
  onBack: GoHome;
  onPlay: (championId: string, opponentId: string, difficulty: AIDifficulty) => void;
  onGallery: () => void;
};

type GalleryProps = {
  onBack: GoHome;
  onPlay: () => void;
};

const factionInfo: {id: Faction; tagline: string; description: string; symbol: string; hint: string}[] = [
  {id:"red",tagline:"La fuerza del orden",description:"Encadená jugadas y prepará un gran remate en Diestra.",symbol:"✦",hint:"Ataque · Secuencias"},
  {id:"blue",tagline:"El arte de responder",description:"Cambiá el Poder rival, interrumpí habilidades y adaptate.",symbol:"✧",hint:"Control · Reacción"},
  {id:"white",tagline:"La memoria perdura",description:"Construí tus Archivos para ser más fuerte en rondas posteriores.",symbol:"◇",hint:"Archivo · Crecimiento"},
  {id:"saints",tagline:"La belleza de la simetría",description:"Buscá patrones, empates y combinaciones de posiciones.",symbol:"◈",hint:"Patrones · Equilibrio"},
  {id:"ivory",tagline:"El poder de la coincidencia",description:"Jugá en la misma posición que el rival para activar Augurio +3 en ese duelo.",symbol:"☾",hint:"Augurio · Posiciones"}
];

const beginnerExplanations: Record<string, string> = {
  dextral: "Te deja ocupar Diestra dos veces en una misma ronda. Ideal si te gusta concentrar tus mejores golpes en esa posición.",
  athos: "Si ganás usando Diestra, obtenés un espacio adicional allí para seguir atacando. Podés llegar a tres cartas en Diestra en esa ronda.",
  sinistral: "Podés usar Siniestra dos veces por ronda. Además, después de tu primera derrota de cada ronda, la siguiente carta rival pierde 2 Poder.",
  vinira: "Una vez por ronda, la primera carta que juegues fuera de su posición preferida activa igualmente su habilidad posicional y obtiene +2 Poder.",
  empireos: "Si tu rival juega en las tres posiciones durante una ronda, tu próxima carta gana +2 Poder. Castigás a quien usa todo el tablero.",
  desartes: "Podés ocupar dos veces las posiciones que tengan más cartas en tu Archivo. Si varias están empatadas, todas sirven.",
  santo_simetrico: "Una vez por ronda, cuando ibas a perder por exactamente 1 Poder, convertís esa derrota en empate.",
  samas: "Después de un duelo empatado, tu siguiente carta de esa misma ronda obtiene +2 Poder.",
  prioresa_luna_llena: "Cada tres Augurios acertados, recuperás 1 Vida. Podés curarte hasta dos veces en la partida y nunca superar 9 Vida."
};

// Images will be assigned here when the final Champion portraits are ready.
// Example: dextral: "./champions/majestad-dextral.webp"
const championPortraits: Partial<Record<string, string>> = {};

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
  onPlay,onTutorial,onGallery,onPhysical,onDeckLab,onContinue,saved,summary,
  analyticsReady,analyticsConsent,onChangeAnalytics
}: {
  onPlay:()=>void;onTutorial:()=>void;onGallery:()=>void;onPhysical:()=>void;onDeckLab:()=>void;
  onContinue:()=>void;saved:SavedMatch|null;
  summary:{total:number;wins:number;losses:number;draws:number;winRate:number};
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
    {id:"play", index:"01", title:"EMPEZAR PARTIDA", subtitle:"Elegí tu Champion y enfrentate a la IA.", image:"dagger.webp", fallback:"./factions/red-portrait.webp", action:onPlay},
    ...(saved ? [{
      id:"continue", index:"↳", title:"CONTINUAR PARTIDA",
      subtitle:`${saved.game.player.champion.name} vs. ${saved.game.opponent.champion.name} · Ronda ${saved.game.round}`,
      image:"banner.webp", fallback:"./factions/saints-portrait.webp", action:onContinue
    }] : []),
    {id:"learn", index:"02", title:"APRENDER A JUGAR", subtitle:"Conocé las reglas en un tutorial interactivo.", image:"egg.webp", fallback:"./factions/white-portrait.webp", action:onTutorial},
    {id:"library", index:"03", title:"VER CARTAS", subtitle:"Explorá las cartas y sus habilidades.", image:"book.webp", fallback:"./factions/ivory-portrait.webp", action:onGallery}
  ];

  return (
    <main className="fo-shell home-screen">
      <header className="fo-topbar">
        <span className="fo-wordmark">
          <img src="./branding/menu/crown.svg" alt="" aria-hidden="true" className="menu-top-crown" />
          DAGGERLIGHT
        </span>
        <div className="fo-header-actions">
          <span className="fo-top-meta">TCG · PROTOTIPO</span>
          <ThemeToggle />
        </div>
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
          <span className="home-hero-caption">DAGGERLIGHT · UN JUEGO DE QUIRALIDAD</span>
        </section>
        <nav className="home-actions" aria-label="Menú principal">
          {buttons.map(button => (
            <button
              key={button.id}
              type="button"
              className={"home-action action-" + button.id + (selectedAction === button.id ? " is-selected" : "")}
              onClick={() => activate(button.id,button.action)}
            >
              <span className="home-action-index">{button.index}</span>
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
        </nav>
      </div>
      <footer className="fo-footer menu-footer">
        <span className="menu-record">{summary.total} PARTIDAS · {summary.wins} VICTORIAS · {summary.losses} DERROTAS · {summary.draws} EMPATES</span>
        <div className="menu-extras">
          <button type="button" className="home-physical-link" onClick={onPhysical}>MODO MESA · BETA</button>
          <button type="button" className="home-physical-link" onClick={onDeckLab}>MAZOS MULTIFACCIÓN · LAB</button>
        </div>
        {analyticsReady ? <label className="home-analytics-consent">
          <input type="checkbox" checked={analyticsConsent} onChange={event=>onChangeAnalytics(event.target.checked)} />
          Compartir estadísticas anónimas
        </label> : <span className="menu-local-stats">ESTADÍSTICAS LOCALES</span>}
      </footer>
    </main>
  );
}

export function ChampionPicker({onBack,onPlay,onGallery}:ChampionPickerProps) {
  const [faction,setFaction]=useState<Faction|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [opponent,setOpponent]=useState("random");
  const [showRival,setShowRival]=useState(false);
  const [difficulty,setDifficulty]=useState<AIDifficulty>("normal");
  const [loadedArt,setLoadedArt]=useState<Partial<Record<Faction,boolean>>>({});
  const championsAnchor=useRef<HTMLElement|null>(null);
  const rivalAnchor=useRef<HTMLDivElement|null>(null);
  const activeChampions=faction?Object.values(champions).filter(c=>c.faction===faction):[];
  const chosen=selected?champions[selected]:null;
  const meta=faction?factionInfo.find(f=>f.id===faction):null;

  useEffect(()=>{
    if(!faction)return;
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth";
    const frame=window.requestAnimationFrame(()=>championsAnchor.current?.scrollIntoView({behavior:motion==="instant"?"instant":"smooth",block:"start"}));
    return ()=>window.cancelAnimationFrame(frame);
  },[faction]);

  useEffect(()=>{
    if(!selected)return;
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth";
    const frame=window.requestAnimationFrame(()=>rivalAnchor.current?.scrollIntoView({behavior:motion==="instant"?"instant":"smooth",block:"center"}));
    return ()=>window.cancelAnimationFrame(frame);
  },[selected]);

  function selectFaction(next:Faction) {
    if(faction===next) { setFaction(null);setSelected(null);return; }
    setFaction(next);
    setSelected(null);
    setShowRival(false);
  }

  return (
    <main className="fo-shell picker-screen">
      <header className="fo-topbar">
        <button type="button" className="fo-back" onClick={onBack}>← INICIO</button>
        <span className="fo-wordmark"><span className="fo-glyph">✦</span> DAGGERLIGHT</span>
        <div className="fo-header-actions"><button type="button" className="fo-text-button" onClick={onGallery}>VER CARTAS ↗</button><ThemeToggle /></div>
      </header>
      <section className="fo-intro picker-intro">
        <span className="fo-eyebrow">ANTES DE ENTRAR EN COMBATE</span>
        <h1>Elegí tu facción</h1>
        <p>Cada facción tiene un estilo propio. Elegí una para conocer a sus Champions.</p>
      </section>

      <section className="faction-banner-grid" aria-label="Facciones disponibles">
        {factionInfo.map((f,idx)=>
          <button
            type="button"
            key={f.id}
            className={"faction-banner theme-"+f.id+(loadedArt[f.id]?" faction-has-art":"")+(faction===f.id?" active":"")}
            aria-pressed={faction===f.id}
            onClick={()=>selectFaction(f.id)}
          >
            <img className="faction-banner-image" src={factionArtUrl(f.id,"portrait")} alt="" aria-hidden="true" loading="lazy" decoding="async"
              onLoad={()=>setLoadedArt(previous=>previous[f.id]?previous:{...previous,[f.id]:true})}/>
            <span className="faction-banner-index">{String(idx+1).padStart(2,"0")} / 05</span>
            <span className="faction-banner-art" aria-hidden="true"><span className="faction-banner-symbol">{f.symbol}</span><i/></span>
            <span className="faction-banner-content">
              <strong>{factionLabels[f.id]}</strong>
              <small>{f.tagline}</small>
            </span>
            <span className="faction-banner-select">{faction===f.id?"SELECCIONADA":"SELECCIONAR"} <span aria-hidden="true">{faction===f.id?"✓":"+"}</span></span>
          </button>
        )}
      </section>

      {faction&&meta&&(
        <section ref={championsAnchor} className={"champion-selection theme-"+faction} aria-label="Elegir Champion">
          <div className="champion-section-heading">
            <div>
              <span className="fo-eyebrow">TU FACCIÓN</span>
              <h2>Elegí un Champion de {factionLabels[faction]}</h2>
              <p>{meta.description}</p>
            </div>
            <span className="champion-style">{meta.hint}</span>
          </div>
          <div className="champion-choices">
            {activeChampions.map(c=>{
              const portrait=championPortraits[c.id];
              return (
                <button
                  type="button"
                  key={c.id}
                  className={"champion-option"+(selected===c.id?" selected":"")}
                  aria-pressed={selected===c.id}
                  onClick={()=>setSelected(c.id)}
                >
                  <span className="champion-portrait">
                    {portrait
                      ? <img src={portrait} alt=""/>
                      : <span className="champion-portrait-sigil" aria-hidden="true">{meta.symbol}</span>}
                  </span>
                  <span className="champion-option-copy">
                    <small>CHAMPION</small><strong>{c.name}</strong>
                    <span>{selected===c.id?"SELECCIONADO":"ELEGIR CHAMPION"}</span>
                  </span>
                  <span className="champion-check" aria-hidden="true">{selected===c.id?"✓":"+"}</span>
                </button>
              );
            })}
            {activeChampions.length===1&&(
              <div className="champion-future"><span aria-hidden="true">◇</span><strong>Próximamente</strong><small>Un nuevo Champion</small></div>
            )}
          </div>
          {chosen ? (
            <>
              <div className="champion-ability" aria-live="polite">
                <div className="champion-ability-symbol" aria-hidden="true">{meta.symbol}</div>
                <div>
                  <span className="fo-eyebrow">HABILIDAD DE {chosen.name.toUpperCase()}</span>
                  <strong>{chosen.text}</strong><p>{beginnerExplanations[chosen.id]}</p>
                </div>
              </div>
              <div className="champion-bottom" ref={rivalAnchor}>
                <div className="champion-rival-picker">
                  <button type="button" className="fo-expand-button" aria-expanded={showRival} onClick={()=>setShowRival(v=>!v)}>
                    RIVAL: {opponent==="random"?"ALEATORIO":champions[opponent].name.toUpperCase()} <span aria-hidden="true">{showRival?"⌃":"⌄"}</span>
                  </button>
                  {showRival&&(
                    <label className="champion-rival-select"><span>Elegí un rival para probar el enfrentamiento</span>
                      <select value={opponent} onChange={e=>setOpponent(e.target.value)}>
                        <option value="random">Aleatorio</option>
                        {Object.values(champions).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <div className="ai-difficulty-picker">
                  <label htmlFor="difficulty-mode">DIFICULTAD DE LA IA</label>
                  <select id="difficulty-mode" value={difficulty} onChange={event=>setDifficulty(event.target.value as AIDifficulty)}>
                    <option value="easy">Fácil · Aprendiz</option>
                    <option value="normal">Normal · Estratega</option>
                    <option value="hard">Difícil · Maestro</option>
                  </select>
                  <small>{difficulty==="easy"
                    ? "Un rival accesible que explora jugadas."
                    : difficulty==="hard"
                      ? "Planifica combinaciones y evita activar Augurios del rival cuando le conviene."
                      : "La IA del prototipo original, con decisiones tácticas."}</small>
                </div>
                <button type="button" className="fo-main-cta" onClick={()=>onPlay(chosen.id,opponent,difficulty)}>JUGAR CON {chosen.name.toUpperCase()} <span aria-hidden="true">→</span></button>
              </div>
            </>
          ):(
            <p className="champion-prompt">Seleccioná un Champion para conocer su habilidad y empezar la partida.</p>
          )}
        </section>
      )}
      <footer className="fo-footer">TU CHAMPION DEFINE LA FACCIÓN DE TU MAZO Y TU FORMA DE JUGAR.</footer>
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
  const totalArt=allCards.filter(c=>!!c.art).length;
  return (
    <main className="fo-shell library-screen">
      <header className="fo-topbar">
        <button className="fo-back" type="button" onClick={onBack}>← INICIO</button>
        <span className="fo-wordmark"><span className="fo-glyph">✦</span> DAGGERLIGHT</span>
        <div className="fo-header-actions"><button type="button" className="fo-text-button" onClick={onPlay}>JUGAR ↗</button><ThemeToggle /></div>
      </header>
      <section className="fo-intro library-intro">
        <span className="fo-eyebrow">ARCHIVO DE LA QUIRALIDAD</span>
        <h1>La colección</h1>
        <p>Explorá los {allCards.length} diseños del juego. Tocá una carta para verla en detalle y leer su habilidad.</p>
        <div className="library-stats"><span><b>{allCards.length}</b> DISEÑOS</span><span><b>{factionInfo.length}</b> FACCIONES</span><span><b>{totalArt}</b> CARTAS ILUSTRADAS</span></div>
      </section>
      <div className="library-toolbar">
        <div className="library-faction-filters" role="group" aria-label="Filtrar cartas por facción">
          <button type="button" className={faction==="all"?"current":""} onClick={()=>setFaction("all")} aria-pressed={faction==="all"}>TODAS</button>
          {factionInfo.map(f=><button type="button" key={f.id} className={(faction===f.id?"current ":"")+"theme-"+f.id} onClick={()=>setFaction(f.id)} aria-pressed={faction===f.id}>{factionLabels[f.id]}</button>)}
        </div>
        <label className="library-search"><span className="sr-only">Buscar carta por nombre o ID</span><span aria-hidden="true">⌕</span><input placeholder="Buscar una carta..." value={query} onChange={e=>setQuery(e.target.value)} type="search" /></label>
      </div>
      <div className="library-result-heading"><strong>{filtered.length} {filtered.length===1?"CARTA":"CARTAS"}</strong><span>ARTE COMPLETO DISPONIBLE PARA LAS FACCIONES ILUSTRADAS</span></div>
      {filtered.length===0 ? <div className="library-empty">No se encontraron cartas con ese filtro. Probá con otro nombre.</div> : <section className="library-grid" aria-label="Cartas">
        {filtered.map(card=><button type="button" key={card.studioId} className={"library-card-tile theme-"+card.faction} onClick={()=>{setSelected(card);setView("art");}} aria-label={"Ver "+card.name}>
          <div className="library-tile-art"><Sprite card={card} crop={!!card.art}/></div>
          <div className="library-tile-text"><span className="library-tile-id">{card.studioId} <b>{card.power} P</b></span><strong>{card.name}</strong><span>{factionLabels[card.faction]}</span></div>
        </button>)}
      </section>}
      <footer className="fo-footer">COLECCIÓN EN DESARROLLO · FUTURA BASE DEL CONSTRUCTOR DE MAZOS MULTIFACCIÓN</footer>
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
            {!selected.art && <div className="library-art-note">Esta carta todavía no tiene ilustración final. La ficha muestra su diseño mecánico vigente.</div>}
            <small>El efecto se aplica según las reglas y el momento del duelo. Algunos efectos requieren preparar una jugada anterior.</small>
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
