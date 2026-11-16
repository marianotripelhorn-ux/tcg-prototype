import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { championBackgroundUrl, championImageUrl, championShortName, championSubtitle } from "../championArtwork";
import { DEFAULT_PLAYER_NAME } from "../playerProfile";
import { positionLabels, positions } from "../data";
import type { CardDefinition, Position } from "../types";
import type { EnginePlay, GameState, PlayerState } from "../engine/types";

type Side = "player" | "opponent";

const factionAccent:Record<string,string> = {
  red:"#9b2d22", blue:"#6b76a6", white:"#b1a27c",
  saints:"#b6a04c", ivory:"#8e9fb4"
};

function ChampionPanel({
  side, state, userLabel, expanded, onSelect
}:{
  side:Side;state:PlayerState;userLabel:string;expanded:boolean;
  onSelect:()=>void;
}) {
  const champion = state.champion;
  const factionArt = {backgroundImage:`url("${championBackgroundUrl(champion.faction)}")`};
  const subtitle = championSubtitle(champion.name);
  return <section
    className={`hybrid-champion-panel ${side} ${expanded?"is-expanded":"is-compact"}`}
    data-faction={champion.faction}
    style={{"--hybrid-faction-accent":factionAccent[champion.faction]} as CSSProperties}
  >
    <button
      type="button"
      className="hybrid-champion-trigger"
      aria-expanded={expanded}
      aria-label={`${userLabel}: ${champion.name}. ${champion.text}. Mostrar datos del Campeón`}
      onClick={onSelect}
    >
      <span className="hybrid-banner-fabric" aria-hidden="true" style={factionArt}/>
      <span className="hybrid-portrait-surface" style={factionArt}>
        <img className="hybrid-champion-art" src={championImageUrl(champion.id,true)} alt="" decoding="async"/>
        <span className="hybrid-panel-overline">{userLabel}</span>
        <span className="hybrid-mini-name">{championShortName(champion.name)}</span>
      </span>
      <span className="hybrid-banner-body" aria-hidden={!expanded}>
        <span className="hybrid-banner-owner">{userLabel}</span>
        <span className="hybrid-banner-name">{championShortName(champion.name)}</span>
        {subtitle && <span className="hybrid-banner-subtitle">{subtitle}</span>}
        <span className="hybrid-banner-faction">{champion.faction==="red"?"GUARDIA DEXTRAL":
          champion.faction==="blue"?"CORTE SINISTRAL":
          champion.faction==="white"?"EMPÍREOS":
          champion.faction==="saints"?"SANTOS":"PRIORATO DE MARFIL"}</span>
        <span className="hybrid-banner-divider" />
        <span className="hybrid-banner-ability">{champion.text}</span>
      </span>
      <span className="hybrid-champion-figure-window" aria-hidden="true">
        <img className="hybrid-champion-figure" src={championImageUrl(champion.id)} alt="" decoding="async"/>
      </span>
      <span className="board-gs-banner-overlay" aria-hidden="true">
        <span className="board-gs-banner-wave"/>
        <span className="board-gs-banner-circle outer"/>
        <span className="board-gs-banner-circle inner"/>
      </span>
    </button>
  </section>;
}

/** Independent sidebar geometry: one panel remains expanded, so the board never reflows. */
export function HybridSidebar({player,opponent,playerName}:{
  player:PlayerState;opponent:PlayerState;playerName:string;
}) {
  const [expanded,setExpanded]=useState<Side>("player");
  const ownName=playerName.trim()&&playerName!=="JUGADOR"?playerName.trim():DEFAULT_PLAYER_NAME;
  return <div className={`hybrid-sidebar-inner show-${expanded}`}>
    <ChampionPanel side="opponent" state={opponent} userLabel="RIVAL"
      expanded={expanded==="opponent"} onSelect={()=>setExpanded("opponent")}/>
    <ChampionPanel side="player" state={player} userLabel={ownName}
      expanded={expanded==="player"} onSelect={()=>setExpanded("player")}/>
    <span className="hybrid-sidebar-base" aria-hidden="true">DAGGERLIGHT <i>✧</i> QUIRALIDAD</span>
  </div>;
}

function LifeCrest({side,life,healed}:{
  side:Side;life:number;healed:number;
}) {
  const previousLife=useRef(life);
  const [change,setChange]=useState<{direction:""|"is-damaged"|"is-healed";sequence:number}>({direction:"",sequence:0});
  useEffect(()=>{
    if(previousLife.current===life)return;
    const direction=life<previousLife.current?"is-damaged":"is-healed";
    previousLife.current=life;
    setChange(current=>({direction,sequence:current.sequence+1}));
    const timer=window.setTimeout(()=>setChange(current=>({...current,direction:""})),1450);
    return ()=>window.clearTimeout(timer);
  },[life]);
  return <div className={`hybrid-life-unit ${side}${change.direction?` ${change.direction}`:""}`} aria-label={`${side==="player"?"Tu Campeón":"Campeón rival"}: ${life} de 9 puntos de Vida`}>
    <span className="hybrid-life-label">{side==="player"?"TU VIDA":"VIDA RIVAL"}</span>
    <div className="board-gs-crest-anchor">
      <div className="hybrid-life-crest">
        <span className="hybrid-life-number" key={life}>{life}</span>
        {change.direction && <span className="hybrid-life-wave" key={change.sequence} aria-hidden="true"/>}
      </div>
      {change.direction && <span className="board-gs-crest-circles" aria-hidden="true" key={"gold-shadow-"+change.sequence}>
        <span/><span/>
      </span>}
    </div>
    {healed>0 && <span className="hybrid-healed-label">+{healed} RECUPERADA</span>}
  </div>;
}

export function HybridRightRail({
  playerLife,opponentLife,playerHealed,opponentHealed,score,deckRemaining,discardCount
}:{
  playerLife:number;opponentLife:number;playerHealed:number;opponentHealed:number;
  score:{player:number;opponent:number};deckRemaining:number;discardCount:number;
}) {
  const [deckOpen,setDeckOpen]=useState(false);
  return <aside className="hybrid-right-rail" aria-label="Vida, marcador y mazo">
    <LifeCrest side="opponent" life={opponentLife} healed={opponentHealed}/>
    <div className="hybrid-duel-tally" aria-label={`Duelos de esta ronda: vos ${score.player}, rival ${score.opponent}`}>
      <span className="hybrid-tally-label">DUELOS</span>
      <strong className="hybrid-score-values"><span>{score.player}</span><i aria-hidden="true">–</i><span>{score.opponent}</span></strong>
      <span className="hybrid-tally-sides">VOS · RIVAL</span>
    </div>
    <LifeCrest side="player" life={playerLife} healed={playerHealed}/>
    <div className="hybrid-deck-holder">
      <button type="button" className="hybrid-deck-object"
        aria-expanded={deckOpen} aria-label={`Mazo: ${deckRemaining} cartas restantes. Mostrar datos del mazo`}
        title={`Mazo · ${deckRemaining} cartas restantes`}
        onClick={()=>setDeckOpen(current=>!current)}>
        <span className="hybrid-deck-layer" aria-hidden="true"/>
        <span className="hybrid-deck-face" aria-hidden="true">
          <img className="hybrid-deck-art" src={`${import.meta.env.BASE_URL}board/cardback-gold.png`}
            alt="" decoding="async"/>
        </span>
      </button>
      <span className="hybrid-deck-count">MAZO · <b>{deckRemaining}</b></span>
      {deckOpen && <div className="hybrid-deck-info" role="status">
        <b>MAZO</b><span>{deckRemaining} restantes</span>
        <span>{discardCount} descartadas</span>
        <small>Se recicla al inicio de la ronda cuando quedan menos de tres cartas.</small>
      </div>}
    </div>
  </aside>;
}

export function HybridCommandRail({
  game,pendingOpponent,selectedCard,latestEvent,duelResolving,transitionLabel,displayRound,displayTurn,decisionOnField=false,onChooseQuiero
}:{
  game:GameState;pendingOpponent:EnginePlay|null;selectedCard:CardDefinition|null;
  latestEvent:string;duelResolving:boolean;transitionLabel?:string;displayRound?:number;displayTurn?:number;decisionOnField?:boolean;onChooseQuiero:(wants:boolean)=>void;
}) {
  let status=latestEvent;
  if (transitionLabel) status=transitionLabel;
  else if (duelResolving) status="Resolviendo el duelo…";
  else if (game.phase==="awaiting_quiero") status="La ronda está 0–2. ¿Querés disputar el tercer duelo?";
  else if (pendingOpponent) status=`El rival abrió con ${pendingOpponent.card.name} en ${positionLabels[pendingOpponent.position]}. Elegí tu respuesta.`;
  else if (selectedCard) status=`${selectedCard.name} seleccionada · elegí una posición legal.`;
  else if (game.phase==="awaiting_player") status="Tu turno · seleccioná una carta y su posición.";
  else if (game.phase==="finished") status="Partida terminada.";

  const bannerBackground=championBackgroundUrl(game.player.champion.faction);
  return <section className="hybrid-command-rail" aria-label="Comandos del tablero">
    <div className="hybrid-command-left">
      <details className="hybrid-archive-details">
        <summary title="Ver cantidades de los seis Archivos">ARCHIVOS <span>⌄</span></summary>
        <div className="hybrid-archive-popover">
          <strong>ARCHIVOS POR POSICIÓN</strong>
          <div className="hybrid-archive-key"><span>POSICIÓN</span><span>RIVAL</span><span>VOS</span></div>
          {positions.map((position:Position)=><div className="hybrid-archive-row" key={position}>
            <span>{positionLabels[position]}</span>
            <b>{game.opponent.archives[position].length}</b>
            <b>{game.player.archives[position].length}</b>
          </div>)}
          <small>Las cartas se archivan al finalizar cada ronda.</small>
        </div>
      </details>
      <details className="hybrid-history-details">
        <summary>HISTORIAL <span>⌄</span></summary>
        <div className="hybrid-history-popover">
          <strong>ÚLTIMOS EVENTOS</strong>
          {game.events.slice(-6).reverse().map((event,index)=><p key={index}>{event.text}</p>)}
        </div>
      </details>
    </div>
    <div className="hybrid-command-status" role="status" aria-live="polite">{status}</div>
    {game.phase==="awaiting_quiero" && !duelResolving && !decisionOnField
      ? <div className="hybrid-quiero-actions" role="group" aria-label="Decisión de tercer duelo"
          style={{backgroundImage:`linear-gradient(180deg,#080a08a8,#11180dbf),url("${bannerBackground}")`}}>
          <span className="hybrid-quiero-overline">TERCER DUELO</span>
          <strong>¿QUERÉS CONTINUAR?</strong>
          <span className="hybrid-quiero-rule" aria-hidden="true"/>
          <button type="button" className="is-primary" onClick={()=>onChooseQuiero(true)}>QUIERO</button>
          <button type="button" onClick={()=>onChooseQuiero(false)}>NO QUIERO</button>
        </div>
      : <div className="hybrid-command-round">RONDA <b>{displayRound??game.round}</b> · DUELO <b>{displayTurn??game.turn}/3</b></div>}
  </section>;
}

export function HybridEngraving(){
  const engraving=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const node=engraving.current;
    const root=node?.closest(".arena-main");
    const field=root?.querySelector(".battlefield");
    if(!node||!root||!field)return;
    const align=()=>{
      const area=root.getBoundingClientRect();
      const ribbon=field.getBoundingClientRect();
      const offset=(ribbon.left+ribbon.width/2)-(area.left+area.width/2);
      node.style.setProperty("--hybrid-compass-offset",`${Math.max(-70,Math.min(70,offset)).toFixed(1)}px`);
    };
    align();
    const observer=new ResizeObserver(align);
    observer.observe(root);observer.observe(field);
    window.addEventListener("resize",align);
    return ()=>{observer.disconnect();window.removeEventListener("resize",align);};
  },[]);
  return <div ref={engraving} className="hybrid-engraving is-reference-compass" aria-hidden="true"/>;
}
