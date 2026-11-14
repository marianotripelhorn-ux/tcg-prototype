import { useState, type CSSProperties } from "react";
import { championBackgroundUrl, championImageUrl } from "../championArtwork";
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
  side, state, userLabel, expanded, onExpand, onHoverEnd
}:{
  side:Side;state:PlayerState;userLabel:string;expanded:boolean;
  onExpand:()=>void;onHoverEnd:()=>void;
}) {
  const champion = state.champion;
  return <section
    className={`hybrid-champion-panel ${side} ${expanded?"is-expanded":"is-compact"}`}
    style={{"--hybrid-faction-accent":factionAccent[champion.faction]} as CSSProperties}
    onPointerLeave={event=>{if(event.pointerType==="mouse")onHoverEnd();}}
  >
    <button
      type="button"
      className="hybrid-champion-trigger"
      aria-expanded={expanded}
      aria-label={`${userLabel}: ${champion.name}. ${champion.text}. Mostrar datos del Campeón`}
      onPointerEnter={event=>{if(event.pointerType==="mouse")onExpand();}}
      onFocus={onExpand}
      onClick={onExpand}
    >
      <span className="hybrid-portrait-surface" style={{backgroundImage:`url("${championBackgroundUrl(champion.faction)}")`}}>
        <img className="hybrid-champion-art" src={championImageUrl(champion.id,true)} alt="" decoding="async"/>
        <span className="hybrid-panel-overline">{userLabel}</span>
        <span className="hybrid-mini-name">{champion.name}</span>
      </span>
      <span className="hybrid-banner-body" aria-hidden={!expanded}>
        <span className="hybrid-banner-owner">{userLabel}</span>
        <span className="hybrid-banner-name">{champion.name}</span>
        <span className="hybrid-banner-faction">{champion.faction==="red"?"GUARDIA DEXTRAL":
          champion.faction==="blue"?"CORTE SINISTRAL":
          champion.faction==="white"?"EMPÍREOS":
          champion.faction==="saints"?"SANTOS":"PRIORATO DE MARFIL"}</span>
        <span className="hybrid-banner-divider" />
        <span className="hybrid-banner-ability">{champion.text}</span>
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
      expanded={expanded==="opponent"} onExpand={()=>setExpanded("opponent")}
      onHoverEnd={()=>setExpanded("player")}/>
    <ChampionPanel side="player" state={player} userLabel={ownName}
      expanded={expanded==="player"} onExpand={()=>setExpanded("player")}
      onHoverEnd={()=>{}}/>
    <span className="hybrid-sidebar-base" aria-hidden="true">DAGGERLIGHT <i>✧</i> QUIRALIDAD</span>
  </div>;
}

function LifeCrest({side,life,healed}:{
  side:Side;life:number;healed:number;
}) {
  return <div className={`hybrid-life-unit ${side}`} aria-label={`${side==="player"?"Tu Campeón":"Campeón rival"}: ${life} de 9 puntos de Vida`}>
    <span className="hybrid-life-label">{side==="player"?"TU VIDA":"VIDA RIVAL"}</span>
    <div className="hybrid-life-crest">
      <span className="hybrid-life-number" key={life}>{life}</span>
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
    <div className="hybrid-duel-tally" aria-label={`Duelos de esta ronda: rival ${score.opponent}, vos ${score.player}`}>
      <span className="hybrid-tally-label">DUELOS</span>
      <strong>{score.opponent}–{score.player}</strong>
    </div>
    <LifeCrest side="player" life={playerLife} healed={playerHealed}/>
    <div className="hybrid-deck-holder">
      <button type="button" className="hybrid-deck-object"
        aria-expanded={deckOpen} aria-label={`Mazo: ${deckRemaining} cartas restantes. Mostrar datos del mazo`}
        title={`Mazo · ${deckRemaining} cartas restantes`}
        onClick={()=>setDeckOpen(current=>!current)}>
        <span className="hybrid-deck-layer" aria-hidden="true"/>
        <span className="hybrid-deck-face" aria-hidden="true">
          <span className="hybrid-deck-ornament"/>
          <img src={`${import.meta.env.BASE_URL}branding/logo.svg`} alt=""/>
          <span>DAGGERLIGHT</span>
        </span>
      </button>
      {deckOpen && <div className="hybrid-deck-info" role="status">
        <b>MAZO</b><span>{deckRemaining} restantes</span>
        <span>{discardCount} descartadas</span>
        <small>Se recicla al inicio de la ronda cuando quedan menos de tres cartas.</small>
      </div>}
    </div>
  </aside>;
}

export function HybridCommandRail({
  game,pendingOpponent,selectedCard,latestEvent,duelResolving,onChooseQuiero
}:{
  game:GameState;pendingOpponent:EnginePlay|null;selectedCard:CardDefinition|null;
  latestEvent:string;duelResolving:boolean;onChooseQuiero:(wants:boolean)=>void;
}) {
  let status=latestEvent;
  if (duelResolving) status="Resolviendo el duelo…";
  else if (game.phase==="awaiting_quiero") status="La ronda está 0–2. ¿Querés disputar el tercer duelo?";
  else if (pendingOpponent) status=`El rival abrió con ${pendingOpponent.card.name} en ${positionLabels[pendingOpponent.position]}. Elegí tu respuesta.`;
  else if (selectedCard) status=`${selectedCard.name} seleccionada · elegí una posición legal.`;
  else if (game.phase==="awaiting_player") status="Tu turno · seleccioná una carta y su posición.";
  else if (game.phase==="finished") status="Partida terminada.";

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
    {game.phase==="awaiting_quiero" && !duelResolving
      ? <div className="hybrid-quiero-actions">
          <button type="button" onClick={()=>onChooseQuiero(false)}>NO QUIERO</button>
          <button type="button" className="is-primary" onClick={()=>onChooseQuiero(true)}>QUIERO</button>
        </div>
      : <div className="hybrid-command-round">RONDA <b>{game.round}</b> · DUELO <b>{game.turn}/3</b></div>}
  </section>;
}

export function HybridEngraving(){
  return <div className="hybrid-engraving" aria-hidden="true" style={{backgroundImage:`url("${import.meta.env.BASE_URL}board/hybrid-engraving.svg")`}}/>;
}
