import { useEffect, useMemo, useRef, useState } from "react";
import Tutorial from "./Tutorial";
import { TUTORIAL_MATCH } from "./onboarding";
import SplashScreen from "./SplashScreen";
import Multiplayer from "./Multiplayer";
import PlaytestHub from "./PlaytestHub";
import { saveAiMatch } from "./playtestStorage";
import ThemeToggle from "./ThemeToggle";
import { factionArtUrl } from "./factionArtwork";
import { championImageUrl,championBackgroundUrl,championShortName } from "./championArtwork";
import { readPlayerName,writePlayerName,DEFAULT_PLAYER_NAME } from "./playerProfile";
import { newArcadeRun,readArcadeRun,writeArcadeRun,arcadeOpponent,markArcadeResult,advanceArcade } from "./arcade";
import type { ArcadeRun } from "./arcade";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import { HomeScreen, ChampionPicker, CardCollection } from "./FrontOffice";
import PhysicalTable from "./PhysicalTable";
import DeckLab from "./DeckLab";
import type { DeckDefinition } from "./engine/decks";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { positionLabels, positions } from "./data";
import { studioThemes } from "./cardStudio";
import { champions } from "./engine/champions";
import { answerQuiero, cloneGame, startGame, submitPlayerPlay, submitPlayerSpecial } from "./engine/game";
import { SPECIAL_NAME,SPECIAL_TEXT,copyTargets } from "./engine/manifestations";
import type { CopyTarget } from "./engine/manifestations";
import { capacity, legalPositions } from "./engine/rules";
import type { AIDifficulty, DuelSummary, EnginePlay, GameState, ActiveManifestation, SpecialKind } from "./engine/types";
import { ManifestCard, ManifestCardDialog } from "./ManifestCard";
import { formatPowerDelta, playEffectFeedback, playPowerDelta } from "./engine/presentation";
import { appendMatchHistory, clearSavedMatch, completedMatch, newSavedMatch, readMatchHistory, readSavedMatch, summarizeHistory, writeSavedMatch } from "./persistence";
import type { SavedMatch } from "./persistence";
import { analyticsAvailable, analyticsOptedIn, sendCompletedMatch, setAnalyticsConsent } from "./telemetry";
import type { CardDefinition, Faction, Position } from "./types";

type DragState = {
  handIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};

type DuelPublicSnapshot = {
  round:number;
  playerLife:number;
  opponentLife:number;
  playerHealed:number;
  opponentHealed:number;
  score:{player:number;opponent:number};
};

type Inspection = {
  card: CardDefinition;
  finalPower?: number;
  powerExact?: boolean;
  notes?: string[];
  handIndex?: number;
};

function FactionMark({ card }: { card: CardDefinition }) {
  return <span className="faction-mark" aria-label={card.faction} />;
}

function TraitMark({ trait }: { trait?: string }) {
  if (!trait) return null;
  return (
    <span className="trait-mark" title={trait} aria-label={trait}>
      ◉
    </span>
  );
}

function cardSpriteStyle(card: CardDefinition): CSSProperties | undefined {
  if (!card.art) return undefined;
  return {
    backgroundImage: cardSpriteBackground(card),
    backgroundSize: "300% 200%",
    backgroundPosition: `${card.art.column * 50}% ${card.art.row * 100}%`
  };
}

function CardFace({
  card,
  finalPower,
  powerExact = true,
  selected = false,
  ghost = false,
  pending = false,
  livePower = false
}: {
  card: CardDefinition;
  finalPower?: number;
  powerExact?: boolean;
  selected?: boolean;
  ghost?: boolean;
  pending?: boolean;
  livePower?: boolean;
}) {
  const theme = studioThemes[card.faction];
  const artReady = useCardArtReady(card);
  const artStyle = cardSpriteStyle(card);
  const themeStyle = {
    "--card-crown": theme.crown,
    "--card-divider": theme.divider,
    "--card-rules": theme.rules,
    "--card-title": theme.title,
    "--card-power": theme.power
  } as CSSProperties;

  if (card.art && artReady) {
    return (
      <article
        className={[
          "game-card",
          card.faction,
          "studio-card",
          selected ? "selected" : "",
          ghost ? "ghost" : "",
          pending ? "pending-card" : ""
        ].filter(Boolean).join(" ")}
        style={themeStyle}
        aria-label={card.name}
      >
        <div className="studio-card-sprite" style={artStyle} />
        {card.trait && <span className="manifest-keyword" title={card.trait}>{card.trait.toUpperCase()}</span>}
        {livePower && (
          <span className={`live-power-badge ${powerExact ? "" : "uncertain"}`}>
            <small>PODER</small>
            <b>{powerExact ? (finalPower ?? card.power) : "?"}</b>
          </span>
        )}
      </article>
    );
  }

  return (
    <article
      className={[
        "game-card",
        card.faction,
        selected ? "selected" : "",
        ghost ? "ghost" : "",
        pending ? "pending-card" : ""
      ].filter(Boolean).join(" ")}
      style={themeStyle}
      aria-label={card.name}
    >
      <div className="card-art no-art" />
      {card.trait && <span className="manifest-keyword">{card.trait.toUpperCase()}</span>}
      <div className="card-shade" />
      <div className="card-power">{powerExact ? (finalPower ?? card.power) : "?"}</div>
      <div className="card-symbols">
        <FactionMark card={card} />
        <TraitMark trait={card.trait} />
      </div>
      <div className="card-copy">
        <strong>{card.name}</strong>
        <p>{card.text}</p>
      </div>
      <span className="card-footer"><i>{card.studioId}</i><i>MT 2026</i></span>
    </article>
  );
}


function DuelPowerCard({played,side}:{played:EnginePlay;side:"player"|"opponent"}) {
  const [resolved,setResolved]=useState(false);
  const printed=played.card.power;
  const final=played.finalPower??printed;
  const delta=final-printed;
  const effect=playEffectFeedback(played);
  useEffect(()=>{
    const timer=window.setTimeout(()=>setResolved(true),side==="player"?520:950);
    return ()=>window.clearTimeout(timer);
  },[played,side]);
  return (
    <div className={"duel-showcase-card"+(resolved?" power-resolved":"")} aria-label={`${played.card.name}, Poder ${printed} pasa a ${final}`}>
      <span className="duel-showcase-side">{side==="player"?"TU CARTA":"RIVAL"}</span>
      <div className="duel-showcase-face">
        <CardFace card={played.card}/>
        <div className={"duel-showcase-power"+(delta<0?" is-loss":delta>0?" is-gain":" is-neutral")} aria-live="off">
          <small>PODER</small>
          <strong key={resolved?"final":"printed"}>{resolved?final:printed}</strong>
          {delta!==0&&<span className="duel-showcase-delta">{formatPowerDelta(played)}</span>}
        </div>
      </div>
      <div className="duel-showcase-details">
        <span className="duel-showcase-cardname">{played.card.name}</span>
        {effect==="inactive"&&<span className="duel-showcase-failed">{played.card.effect==="augury_match3"?"AUGURIO FALLIDO":"HABILIDAD NO ACTIVADA"}</span>}
        {effect==="activated"&&<span className="duel-showcase-activated">HABILIDAD ACTIVADA</span>}
      </div>
    </div>
  );
}

function DuelCardsPresentation({duel,onAdvance,auguryEvents}:{
  duel:DuelSummary;onAdvance:()=>void;auguryEvents:string[];
}) {
  return (
    <div className="duel-showcase-overlay" role="dialog" aria-modal="true" aria-label="Resolución de Poder de las cartas">
      <span className="duel-showcase-heading">DUELO {duel.turn} · RESOLUCIÓN DE PODER</span>
      <div className="duel-showcase-pair">
        <DuelPowerCard played={duel.playerPlay} side="player"/>
        <span className="duel-showcase-versus" aria-hidden="true">VS</span>
        <DuelPowerCard played={duel.opponentPlay} side="opponent"/>
      </div>
      {auguryEvents.length>0&&<div className="duel-showcase-events">{auguryEvents.map((event,index)=><span key={index}>{event}</span>)}</div>}
      <button type="button" className="duel-showcase-skip" onClick={onAdvance}>VER RESULTADO →</button>
    </div>
  );
}

function BattleCard({
  played,
  onInspect
}: {
  played: EnginePlay;
  onInspect: (played:EnginePlay)=>void;
}) {
  const { card } = played;
  const artReady = useCardArtReady(card);
  const theme = studioThemes[card.faction];
  const finalPower = played.finalPower ?? card.power;
  const delta = finalPower - card.power;
  const artStyle = cardSpriteStyle(card);

  return (
    <button
      type="button"
      className={`battle-card ${card.faction} ${card.art && artReady ? "has-studio-art" : "placeholder-art"}`}
      style={{"--card-crown":theme.crown} as CSSProperties}
      aria-label={`Inspeccionar ${card.name}, Poder ${finalPower}`}
      onClick={event=>{
        event.stopPropagation();
        onInspect(played);
      }}
    >
      {card.art && artReady ? (
        <div className="battle-art-window">
          <div className="battle-art-source" style={artStyle} />
        </div>
      ) : (
        <div className="battle-art-window battle-art-placeholder" />
      )}
      <div className="battle-power">
        <strong>{finalPower}</strong>
        {delta !== 0 && (
          <span className={delta > 0 ? "power-up" : "power-down"}>
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      <div className="battle-name">{card.name}</div>
      <span className="battle-crown" />
    </button>
  );
}

function CurrentBoardCard({
  played,
  onInspect,
  pending = false
}: {
  played: EnginePlay;
  onInspect: (played:EnginePlay)=>void;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      className={`current-board-card ${pending ? "pending" : ""}`}
      onClick={event=>{
        event.stopPropagation();
        onInspect(played);
      }}
      aria-label={`Inspeccionar ${played.card.name}`}
    >
      <CardFace
        card={played.card}
        finalPower={played.finalPower}
        powerExact={played.powerExact !== false}
        pending={pending}
        livePower
      />
    </button>
  );
}

function ArenaIcon({name}:{name:"help"|"exit"|"log"}) {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name==="help"
      ? <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.7 2.7 0 1 1 4.3 2.2c-1.2.9-1.9 1.4-1.9 3"/><path d="M12 17h.01"/></>
      :name==="log"
      ? <><path d="M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5"/></>
      : <><path d="M4 12h13 M12 7l5 5-5 5 M20 4v16"/></>}
  </svg>;
}

function ChampionBar({
  side,faction,championId,name,life,passive,healedLife=0,
  playerName,active=false
}: {
  side:"player"|"opponent";
  faction:Faction;
  championId:string;
  name:string;
  life:number;
  passive:string;
  healedLife?:number;
  playerName?:string;
  active?:boolean;
}) {
  const [expanded,setExpanded]=useState(false);
  const label=side==="player"?(playerName?.trim()||DEFAULT_PLAYER_NAME):"RIVAL";
  return (
    <section className={`champion-bar arena-champion ${side} faction-illustrated faction-${faction}${active?" is-active":""}`}>
      <button className="arena-champion-portrait" type="button"
        style={{backgroundImage:`url("${championBackgroundUrl(faction)}")`}}
        aria-label={`${label}: ${championShortName(name)}. ${life} Vida. Tocá para ver la habilidad.`}
        aria-expanded={expanded}
        onClick={()=>setExpanded(!expanded)}>
        <img className="arena-champion-figure" src={championImageUrl(championId)}
          alt="" loading="eager" decoding="async"/>
        <span className="arena-champion-ribbon">{label.toUpperCase()}</span>
        <span className="arena-life" aria-label={`${life} de 9 Vida`}>
          <img src={`${import.meta.env.BASE_URL}branding/menu/life-crown.svg`} alt="" aria-hidden="true"/>
          <b>{life}</b>
          {healedLife>0&&<small>+{healedLife}</small>}
        </span>
        <span className="arena-initiative-ring" aria-hidden="true"/>
      </button>
      <div className={`arena-champion-details${expanded?" is-expanded":""}`}>
        <strong>{championShortName(name)}</strong>
        <span className="arena-champion-passive">{passive}</span>
      </div>
    </section>
  );
}

function samePlay(a:EnginePlay|null|undefined,b:EnginePlay|null|undefined) {
  if (!a || !b) return false;
  return a.card.id===b.card.id && a.position===b.position;
}

function Slot({
  side,
  position,
  cards,
  pendingCard,
  focusPlay,
  archive,
  active,
  capacityValue,
  manifestations,
  archiveCards,
  onTap,
  onInspect,
  onManifestInspect,
  onCopyTarget,
  onCopyArchive,
  onDropRelic
}: {
  side: "player" | "opponent";
  position: Position;
  cards: EnginePlay[];
  pendingCard?: EnginePlay | null;
  focusPlay?: EnginePlay | null;
  archive: number;
  active: boolean;
  capacityValue: number;
  manifestations?: ActiveManifestation[];
  archiveCards?: CardDefinition[];
  onTap?: () => void;
  onInspect: (played:EnginePlay)=>void;
  onManifestInspect: (kind:SpecialKind)=>void;
  onCopyTarget?: (target:CopyTarget)=>void;
  onCopyArchive?: ()=>void;
  onDropRelic?: ()=>void;
}) {
  const focusAlreadyInCards = !!focusPlay && cards.some(played=>samePlay(played,focusPlay));
  const fieldCards=(manifestations||[]).filter(token=>token.position===position);
  const archivedKind=archiveCards?.find(card=>card.specialArchiveKind==="dagger")?.specialArchiveKind
    ||archiveCards?.find(card=>card.specialArchiveKind==="relic")?.specialArchiveKind;
  return (
    <div
      className={`board-slot ${side} ${active ? "drop-active" : ""}`}
      data-position={position}
      data-side={side}
      onClick={side === "player" ? onTap : undefined}
      onDragOver={side==="player"&&onDropRelic
        ? event=>{if(event.dataTransfer.types.includes("text/plain"))event.preventDefault();} : undefined}
      onDrop={side==="player"&&onDropRelic
        ? event=>{if(event.dataTransfer.getData("text/plain")==="daggerlight-relic"){
          event.preventDefault();
          onDropRelic();
        }} : undefined}
    >
      {archivedKind
        ? <button type="button" className="archive-count manifest-archive-button"
          title={onCopyArchive&&archiveCards?.some(card=>card.specialArchiveKind==="dagger")
            ? "Copiar una Daga Etérea archivada con Simetría Perfecta"
            : "Inspeccionar carta especial archivada"}
          onClick={event=>{
            event.stopPropagation();
            if(onCopyArchive&&archiveCards?.some(card=>card.specialArchiveKind==="dagger"))
              onCopyArchive();
            else onManifestInspect(archivedKind);
          }}>{archive}</button>
        : <span className="archive-count" title="Archivo">{archive}</span>}
      <span className="slot-capacity" title="Capacidad">{cards.length}/{capacityValue}</span>
      {!!fieldCards.length && <div className="manifest-board-zone" aria-label="Cartas especiales en esta posición">
        {fieldCards.map((token,index)=><button type="button" key={token.kind+"-"+token.createdRound+"-"+index}
          className={"manifest-board-item"+(onCopyTarget?" is-copy-target":"")}
          title={onCopyTarget
            ? "Copiar "+SPECIAL_NAME[token.kind]+" con Simetría Perfecta"
            : "Ver "+SPECIAL_NAME[token.kind]}
          aria-label={(onCopyTarget?"Copiar ":"Inspeccionar ")+SPECIAL_NAME[token.kind]}
          onClick={event=>{
            event.stopPropagation();
            if(onCopyTarget)onCopyTarget({kind:token.kind,position});
            else onManifestInspect(token.kind);
          }}>
          <ManifestCard kind={token.kind} size="field"/>
        </button>)}
      </div>}
      <div className="slot-stack">
        <>
            {cards.map((played,index)=>(
              <div className="played-card" key={`${played.card.id}-${index}`}>
                {samePlay(played,focusPlay) ? (
                  <CurrentBoardCard played={played} onInspect={onInspect} />
                ) : (
                  <BattleCard played={played} onInspect={onInspect} />
                )}
              </div>
            ))}
            {focusPlay && !focusAlreadyInCards && (
              <div className="played-card current-play">
                <CurrentBoardCard played={focusPlay} onInspect={onInspect} pending={!!pendingCard} />
              </div>
            )}
            {pendingCard && !samePlay(pendingCard,focusPlay) && (
              <div className="played-card pending-play">
                <CurrentBoardCard played={pendingCard} onInspect={onInspect} pending />
              </div>
            )}
        </>
      </div>
    </div>
  );
}

export default function App() {
  const championIds=Object.keys(champions);
  const [playerChampion,setPlayerChampion]=useState("dextral");
  const [opponentChampion,setOpponentChampion]=useState("random");
  const [aiDifficulty,setAiDifficulty]=useState<AIDifficulty>("normal");
  const [screen,setScreen]=useState<"home"|"champions"|"arcade"|"collection"|"table"|"decklab"|"multiplayer"|"playtest">("home");
  const [playerName,setPlayerName]=useState(()=>readPlayerName());
  const [handExpanded,setHandExpanded]=useState(false);
  const [hoveredHandIndex,setHoveredHandIndex]=useState<number|null>(null);
  const [arcadeRun,setArcadeRun]=useState<ArcadeRun|null>(()=>readArcadeRun());
  const [hasEntered,setHasEntered]=useState(false);
  const [game,setGame]=useState<GameState|null>(null);
  const [savedMatch,setSavedMatch]=useState<SavedMatch|null>(()=>readSavedMatch());
  const [matchMeta,setMatchMeta]=useState<SavedMatch|null>(null);
  const [currentDeck,setCurrentDeck]=useState<DeckDefinition|null>(null);
  const [history,setHistory]=useState(()=>readMatchHistory());
  const [analyticsConsent,setTelemetryOn]=useState(()=>analyticsOptedIn());
  const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
  const [inspection,setInspection]=useState<Inspection|null>(null);
  const [duelPreview,setDuelPreview]=useState<DuelSummary|null>(null);
  const [preDuel,setPreDuel]=useState<DuelPublicSnapshot|null>(null);
  const [duelStep,setDuelStep]=useState<"cards"|"result">("cards");
  const [finalStep,setFinalStep]=useState<"ceremony"|"actions">("ceremony");
  const [duelAuguries,setDuelAuguries]=useState<string[]>([]);
  const previewTimer=useRef<number|null>(null);
  const finalTimer=useRef<number|null>(null);
  const finishingMatch=useRef(false);
  const [drag,setDrag]=useState<DragState|null>(null);
  const [hoveredPosition,setHoveredPosition]=useState<Position|null>(null);
  const [tutorialOpen,setTutorialOpen]=useState(false);
  const [daggersToUse,setDaggersToUse]=useState(0);
  const [specialMode,setSpecialMode]=useState<"relic"|"symmetry"|null>(null);
  const [specialError,setSpecialError]=useState("");
  const [specialInspection,setSpecialInspection]=useState<SpecialKind|null>(null);
  const specialHand=game?.player.specialHand||[];
  const availableDaggers=specialHand.filter(kind=>kind==="dagger").length;
  const symmetryTargets=game?copyTargets(game.opponent):[];

  const hand=game?.player.hand ?? [];
  const selectedCard=useMemo(
    ()=>selectedIndex===null ? null : hand[selectedIndex] ?? null,
    [hand,selectedIndex]
  );

  function clearPreviewTimer() {
    if (previewTimer.current!==null) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current=null;
    }
  }

  function clearFinalTimer() {
    if (finalTimer.current!==null) {
      window.clearTimeout(finalTimer.current);
      finalTimer.current=null;
    }
  }

  function isReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function startFinalCeremony() {
    // Remain on VICTORIA / DERROTA / EMPATE until the player presses CONTINUAR.
    clearFinalTimer();
    setFinalStep("ceremony");
  }

  function finishDuelPresentation() {
    clearPreviewTimer();
    setDuelPreview(null);
    setPreDuel(null);
    if (finishingMatch.current) {
      finishingMatch.current=false;
      startFinalCeremony();
    }
  }

  function showDuelResult() {
    clearPreviewTimer();
    setDuelStep("result");
    previewTimer.current=window.setTimeout(finishDuelPresentation,isReducedMotion()?650:1400);
  }

  function persistTurn(next:GameState) {
    if(!matchMeta)return;
    const updated:SavedMatch={...matchMeta,game:next,updatedAt:new Date().toISOString()};
    if(next.phase==="finished") {
      // Arcade records every beaten champion; only a victory unlocks the next one.
      if(arcadeRun && arcadeRun.status==="active" &&
         arcadeRun.championId===next.player.champion.id &&
         arcadeOpponent(arcadeRun)===next.opponent.champion.id){
        const after=markArcadeResult(arcadeRun,next.opponent.champion.id,next.winner==="player");
        setArcadeRun(after);
        writeArcadeRun(after);
      }
      const record=completedMatch(updated);
      if(record && appendMatchHistory(record)){
        saveAiMatch(updated,record);
        setHistory(readMatchHistory());
        sendCompletedMatch(record);
      }
      clearSavedMatch(matchMeta.id);
      setSavedMatch(null);
    } else {
      writeSavedMatch(updated);
      setSavedMatch(updated);
    }
    setMatchMeta(updated);
  }

  function continueMatch() {
    const saved=readSavedMatch();
    if(!saved){setSavedMatch(null);return;}
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    setPlayerChampion(saved.game.player.champion.id);
    setOpponentChampion(saved.rivalSelection);
    setAiDifficulty(saved.game.aiDifficulty??"normal");
    setMatchMeta(saved);
    setCurrentDeck(saved.game.player.deckRecipe?{
      id:"restored-"+saved.game.player.champion.id,
      name:"Mazo multifacción recuperado",
      championId:saved.game.player.champion.id,
      cardIds:[...saved.game.player.deckRecipe]
    }:null);
    setGame(saved.game);
    setDuelPreview(null);
    setPreDuel(null);
    setSelectedIndex(null);
    setDaggersToUse(0);
    setSpecialMode(null);
    setSpecialError("");
    setInspection(null);
    setDrag(null);
    setHoveredPosition(null);
    setDuelAuguries([]);
  }

  function startWithChampion(championId:string, rivalSelection:string, difficulty:AIDifficulty=aiDifficulty,
    deck?:DeckDefinition|null, fromArcade=false) {
    if(!fromArcade){
      setArcadeRun(null);
      writeArcadeRun(null);
    }
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    const opponent = rivalSelection==="random"
      ? championIds.filter(id=>id!==championId)[Math.floor(Math.random()*(championIds.length-1))]
      : rivalSelection;
    setPlayerChampion(championId);
    setOpponentChampion(rivalSelection);
    setAiDifficulty(difficulty);
    const next=startGame(championId,opponent,Math.random,undefined,difficulty,deck?{player:deck}:undefined);
    setCurrentDeck(deck??null);
    const newMatch=newSavedMatch(next,rivalSelection);
    writeSavedMatch(newMatch);
    setSavedMatch(newMatch);
    setMatchMeta(newMatch);
    setGame(next);
    setSelectedIndex(null);
    setHandExpanded(false);
    setHoveredHandIndex(null);
    setInspection(null);
    setDuelPreview(null);
    setPreDuel(null);
    setDuelStep("cards");
    setFinalStep("ceremony");
    setDuelAuguries([]);
    setDrag(null);
    setHoveredPosition(null);
    setDaggersToUse(0);
    setSpecialMode(null);
    setSpecialInspection(null);
    setSpecialError("");
  }

  function startArcade(championId:string,difficulty:AIDifficulty){
    const run=newArcadeRun(championId,difficulty);
    writeArcadeRun(run);
    setArcadeRun(run);
    startWithChampion(championId,run.opponents[0],difficulty,null,true);
  }
  function continueArcade(){
    if(!arcadeRun||arcadeRun.status!=="active")return;
    const opponent=arcadeOpponent(arcadeRun);
    const saved=readSavedMatch();
    if(saved && saved.game.phase!=="finished" &&
       saved.game.player.champion.id===arcadeRun.championId &&
       saved.game.opponent.champion.id===opponent){
      continueMatch();
      return;
    }
    const next=advanceArcade(arcadeRun);
    if(next){
      writeArcadeRun(next);
      setArcadeRun(next);
      startWithChampion(next.championId,next.opponents[next.index],next.difficulty,null,true);
    }else if(opponent && !arcadeRun.victories.includes(opponent)){
      startWithChampion(arcadeRun.championId,opponent,arcadeRun.difficulty,null,true);
    }
  }
  function beginMatch() {
    if(arcadeRun){startArcade(arcadeRun.championId,arcadeRun.difficulty);return;}
    startWithChampion(playerChampion,opponentChampion,aiDifficulty,currentDeck);
  }

  function goToMenu(destination:"home"|"champions"|"arcade"|"collection"|"table"|"decklab") {
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    setDuelPreview(null);
    setPreDuel(null);
    setFinalStep("ceremony");
    setGame(null);
    setDaggersToUse(0);
    setSpecialMode(null);
    setSpecialInspection(null);
    setScreen(destination);
  }

  function showResolvedDuel(duel:DuelSummary|null, finished:boolean) {
    clearPreviewTimer();
    if(!duel) {
      if(finished)startFinalCeremony();
      return;
    }
    finishingMatch.current=finished;
    setDuelStep("cards");
    setDuelPreview(duel);
    previewTimer.current=window.setTimeout(showDuelResult,isReducedMotion()?750:2150);
  }

  function useSpecial(kind:"relic"|"symmetry",position?:Position,target?:CopyTarget) {
    if(!game || game.phase!=="awaiting_player" || duelPreview)return;
    try{
      const next=cloneGame(game);
      submitPlayerSpecial(next,kind,position,target);
      setGame(next);persistTurn(next);
      setSpecialMode(null);setSpecialError("");
    }catch(error){setSpecialError(error instanceof Error?error.message:"No se pudo usar la especial.");}
  }

  function playCard(handIndex:number, position:Position) {
    if (!game || game.phase!=="awaiting_player" || duelPreview) return;
    if (!legalPositions(game.player).includes(position)) return;
    setPreDuel({
      round:game.round,
      playerLife:game.player.life,
      opponentLife:game.opponent.life,
      playerHealed:game.player.healedLife,
      opponentHealed:game.opponent.healedLife,
      score:{...game.duelScore}
    });
    const next=cloneGame(game);
    submitPlayerPlay(next,handIndex,position,Math.random,Math.min(daggersToUse,availableDaggers));
    const newAuguries=next.events.slice(game.events.length).filter(event=>event.text.startsWith("Augurio ·"));
    const healingEvents=next.events.slice(game.events.length).filter(event=>event.text.includes("recupera 1 Vida"));
    setDuelAuguries([...newAuguries,...healingEvents].map(event=>event.text.replace(/^Augurio · /,"").replace(" · próxima carta "," · ")).slice(0,3));
    setGame(next);
    persistTurn(next);
    setSelectedIndex(null);
    setHandExpanded(false);
    setHoveredHandIndex(null);
    setInspection(null);
    setHoveredPosition(null);
    setDrag(null);
    showResolvedDuel(next.lastDuel,next.phase==="finished");
  }

  function chooseQuiero(wants:boolean) {
    if (!game) return;
    const next=cloneGame(game);
    answerQuiero(next,wants);
    setGame(next);
    persistTurn(next);
    if(next.phase==="finished")startFinalCeremony();
    setSelectedIndex(null);
  }

  function inspectPlay(played:EnginePlay) {
    setInspection({
      card:played.card,
      finalPower:played.finalPower,
      powerExact:played.powerExact,
      notes:played.notes
    });
  }

  function zoneAt(x:number,y:number):Position|null {
    if (!game || game.phase!=="awaiting_player" || duelPreview) return null;
    const element=document.elementFromPoint(x,y);
    const zone=element?.closest<HTMLElement>('[data-side="player"][data-position]');
    const position=(zone?.dataset.position as Position|undefined) ?? null;
    return position && legalPositions(game.player).includes(position) ? position : null;
  }

  function handlePointerDown(event:ReactPointerEvent<HTMLButtonElement>, handIndex:number) {
    if (!game || game.phase!=="awaiting_player" || duelPreview) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      handIndex,
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      x:event.clientX,
      y:event.clientY,
      moved:false
    });
  }

  function handlePointerMove(event:ReactPointerEvent<HTMLButtonElement>) {
    setDrag(current=>{
      if (!current || current.pointerId!==event.pointerId) return current;
      const distance=Math.hypot(event.clientX-current.startX,event.clientY-current.startY);
      const moved=current.moved || distance>8;
      if (moved) {
        event.preventDefault();
        setHoveredPosition(zoneAt(event.clientX,event.clientY));
      }
      return {...current,x:event.clientX,y:event.clientY,moved};
    });
  }

  function handlePointerUp(event:ReactPointerEvent<HTMLButtonElement>) {
    const current=drag;
    if (!current || current.pointerId!==event.pointerId) return;
    const destination=current.moved ? zoneAt(event.clientX,event.clientY) : null;
    if (destination) {
      playCard(current.handIndex,destination);
    } else if (!current.moved) {
      const card=hand[current.handIndex];
      if (card) setInspection({card,handIndex:current.handIndex,powerExact:true});
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setHoveredPosition(null);
  }

  if (!hasEntered) return <SplashScreen onStart={()=>setHasEntered(true)} />;

  if (!game) {
    return (
      <>
        {screen==="home" && <HomeScreen
          onPlay={()=>setScreen("champions")}
          onArcade={()=>setScreen("arcade")}
          onContinueArcade={continueArcade}
          arcadeResume={arcadeRun?.status==="active"
            ? `ETAPA ${arcadeRun.index+1}/${arcadeRun.opponents.length} · ${championShortName(champions[arcadeOpponent(arcadeRun)!].name)}`
            : null}
          playerName={playerName}
          onPlayerNameChange={next=>{
            const value=writePlayerName(next);
            setPlayerName(value);
          }}
          onTutorial={()=>setTutorialOpen(true)}
          onGallery={()=>setScreen("collection")}
          onPhysical={()=>setScreen("table")}
          onDeckLab={()=>setScreen("decklab")}
          onMultiplayer={()=>setScreen("multiplayer")}
          onPlaytest={()=>setScreen("playtest")}
          onContinue={continueMatch}
          saved={arcadeRun?.status==="active"?null:savedMatch}
          summary={summarizeHistory(history)}
          analyticsReady={analyticsAvailable()}
          analyticsConsent={analyticsConsent}
          onChangeAnalytics={value=>{setAnalyticsConsent(value);setTelemetryOn(value);}}
        />}
        {screen==="champions" && <ChampionPicker
          onBack={()=>setScreen("home")}
          onPlay={startWithChampion}
          onGallery={()=>setScreen("collection")}
        />}
        {screen==="arcade" && <ChampionPicker
          mode="arcade"
          onBack={()=>setScreen("home")}
          onPlay={(championId,_rival,difficulty)=>startArcade(championId,difficulty)}
          onGallery={()=>setScreen("collection")}
        />}
        {screen==="collection" && <CardCollection
          onBack={()=>setScreen("home")}
          onPlay={()=>setScreen("champions")}
        />}
        {screen==="table" && <PhysicalTable onBack={()=>setScreen("home")}/> }
        {screen==="multiplayer" && <Multiplayer onBack={()=>setScreen("home")} playerName={playerName}/>} 
        {screen==="playtest" && <PlaytestHub onBack={()=>setScreen("home")}/>}
        {screen==="decklab" && <DeckLab onBack={()=>setScreen("home")} onPlay={(deck,rival,difficulty)=>startWithChampion(deck.championId,rival,difficulty,deck)}/> }
        {tutorialOpen && <Tutorial
          inGame={false}
          onClose={()=>setTutorialOpen(false)}
          onPlay={()=>{setTutorialOpen(false);startWithChampion(TUTORIAL_MATCH.championId,TUTORIAL_MATCH.opponentId,TUTORIAL_MATCH.difficulty);}}
        />}
      </>
    );
  }

  const legal=game.phase==="awaiting_player" && !duelPreview ? legalPositions(game.player) : [];
  const displayed=duelPreview?preDuel:null;
  const pendingOpponent=duelPreview ? null : game.pendingOpponentPlay;
  const focusPlayer=duelPreview?.playerPlay ?? null;
  const focusOpponent=duelPreview?.opponentPlay ?? pendingOpponent;
  const latestEvent=game.events.at(-1)?.text ?? "";
  const actingSide=game.phase==="awaiting_player" && !duelPreview ? "player" : null;
  const turnText=duelPreview
    ? `DUELO ${duelPreview.turn} · ${duelStep==="cards"?"PODER":"RESULTADO"}`
    : game.phase==="awaiting_quiero"
      ? "DECISIÓN DE RONDA"
      : game.phase==="finished"
        ? "PARTIDA TERMINADA"
        : `DUELO ${game.turn} · ${game.initiative==="player"?"VOS ABRÍS":"IA ABRE"}`;

  return (
    <main className="app-shell arena-v2">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="game-frame arena-game-frame">
        <section className="match-strip has-guide arena-topbar">
          <span className="arena-top-wordmark">DAGGERLIGHT</span>
          <div className="arena-top-center">
            <span>RONDA <b>{displayed?.round??game.round}</b></span>
            <i aria-hidden="true"/>
            <span>DUELO <b>{duelPreview?.turn??game.turn}</b></span>
            <span className="arena-top-score" title="Duelos ganados, rival y jugador">
              {displayed?.score.opponent??game.duelScore.opponent}—{displayed?.score.player??game.duelScore.player}
            </span>
            {arcadeRun && <em>ARCADE · {arcadeRun.index+1}/{arcadeRun.opponents.length}</em>}
          </div>
          <div className="game-tools">
            <span className="game-difficulty-label" title="Dificultad de la IA">
              {game.aiDifficulty==="easy"?"FÁCIL":game.aiDifficulty==="hard"?"DIFÍCIL":"NORMAL"}
            </span>
            <ThemeToggle compact/>
            <button className="arena-icon-button" type="button" aria-label="Abrir tutorial"
              title="Ayuda" onClick={()=>setTutorialOpen(true)}><ArenaIcon name="help"/></button>
            <button className="arena-icon-button" type="button" aria-label="Volver al menú"
              title="Volver al inicio" onClick={()=>{clearPreviewTimer();goToMenu("home");}}>
              <ArenaIcon name="exit"/></button>
          </div>
        </section>

        <div className="arena-main">
          <aside className="arena-sidebar" aria-label="Campeones y marcador">
            <ChampionBar side="opponent" championId={game.opponent.champion.id}
              faction={game.opponent.champion.faction} name={game.opponent.champion.name}
              life={displayed?.opponentLife??game.opponent.life}
              healedLife={displayed?.opponentHealed??game.opponent.healedLife}
              passive={game.opponent.champion.text}
              active={false}/>
            <div className="arena-score" aria-label={`Duelos ganados: ${game.duelScore.player} a ${game.duelScore.opponent}`}>
              <b>{displayed?.score.opponent??game.duelScore.opponent}</b>
              <span>DUELOS</span>
              <b>{displayed?.score.player??game.duelScore.player}</b>
            </div>
            <ChampionBar side="player" championId={game.player.champion.id}
              faction={game.player.champion.faction} name={game.player.champion.name}
              life={displayed?.playerLife??game.player.life}
              healedLife={displayed?.playerHealed??game.player.healedLife}
              passive={game.player.champion.text}
              playerName={playerName} active={actingSide==="player"}/>
            <div className="arena-sidebar-hand-art" aria-hidden="true"
              style={{backgroundImage:`linear-gradient(0deg,#171816a8,#17181670),url("${championBackgroundUrl(game.player.champion.faction)}")`}}/>
          </aside>
          <div className="arena-stage">
            <span className="arena-visually-hidden" role="status">{turnText}</span>
        <section className={"battlefield"+(duelPreview?" duel-is-resolving":"")} aria-label="Tablero">
          {duelPreview && (duelStep==="cards"
            ? <DuelCardsPresentation duel={duelPreview} auguryEvents={duelAuguries} onAdvance={showDuelResult}/>
            : <button type="button" className={"duel-cinematic duel-cinematic-"+duelPreview.outcome} onClick={finishDuelPresentation} aria-label="Saltar animación del resultado">
              <span className="duel-cinematic-ring" aria-hidden="true"/>
              <span className="duel-cinematic-ring second" aria-hidden="true"/>
              <span className="duel-cinematic-sparks" aria-hidden="true">{duelPreview.outcome==="draw"?"◇  ◇":"✦  ✧  ✦"}</span>
              <span className="duel-cinematic-label">DUELO {duelPreview.turn}</span>
              <strong>{duelPreview.outcome==="player"?"VICTORIA":duelPreview.outcome==="opponent"?"DERROTA":"EMPATE"}</strong>
              <span className="duel-cinematic-powers">{duelPreview.playerPlay.finalPower ?? duelPreview.playerPlay.card.power} <i>—</i> {duelPreview.opponentPlay.finalPower ?? duelPreview.opponentPlay.card.power}</span>
              <span className="duel-cinematic-skip">TOCÁ PARA CONTINUAR</span>
            </button>
          )}
          {positions.map(position=>(
            <div className="lane" key={position}>
              <Slot
                side="opponent"
                position={position}
                cards={game.opponent.roundPlays.filter(play=>play.position===position)}
                pendingCard={pendingOpponent?.position===position ? pendingOpponent : null}
                focusPlay={focusOpponent?.position===position ? focusOpponent : null}
                archive={game.opponent.archives[position].length}
                archiveCards={game.opponent.archives[position]}
                manifestations={game.opponent.manifestations}
                onManifestInspect={setSpecialInspection}
                onCopyTarget={specialMode==="symmetry"
                  ? target=>useSpecial("symmetry",undefined,target) : undefined}
                onCopyArchive={specialMode==="symmetry"&&game.opponent.archives[position]
                  .some(card=>card.specialArchiveKind==="dagger")
                  ? ()=>useSpecial("symmetry",undefined,{kind:"dagger",position}):undefined}
                active={false}
                capacityValue={capacity(game.opponent,position)}
                onInspect={inspectPlay}
              />

              <div className="lane-axis" aria-label={positionLabels[position]}>
                <i aria-hidden="true"/>
                <span>{positionLabels[position]}</span>
                <i aria-hidden="true"/>
              </div>

              <Slot
                side="player"
                position={position}
                cards={game.player.roundPlays.filter(play=>play.position===position)}
                focusPlay={focusPlayer?.position===position ? focusPlayer : null}
                archive={game.player.archives[position].length}
                archiveCards={game.player.archives[position]}
                manifestations={game.player.manifestations}
                onManifestInspect={setSpecialInspection}
                onDropRelic={()=>useSpecial("relic",position)}
                active={specialMode==="relic"
                   ? game.player.roundPlays.every(p=>p.position!==position)
                   : (hoveredPosition===position || (!!selectedCard&&!drag)) && legal.includes(position)}
                capacityValue={capacity(game.player,position)}
                onTap={()=>{
                   if(specialMode==="relic"){useSpecial("relic",position);return;}
                   if(selectedIndex!==null && legal.includes(position))playCard(selectedIndex,position);
                 }}
                onInspect={inspectPlay}
              />
            </div>
          ))}
        </section>

        <div className="action-line" role="status">
          {duelPreview
            ? `Duelo ${duelPreview.turn}: ${duelPreview.playerPlay.card.name} ${duelPreview.playerPlay.finalPower ?? duelPreview.playerPlay.card.power} — ${duelPreview.opponentPlay.finalPower ?? duelPreview.opponentPlay.card.power} ${duelPreview.opponentPlay.card.name}`
            : pendingOpponent
              ? `IA jugó ${pendingOpponent.card.name} en ${positionLabels[pendingOpponent.position]} · Poder ${pendingOpponent.powerExact===false?"?":pendingOpponent.finalPower ?? pendingOpponent.card.power}. Respondé.`
              : latestEvent}
        </div>

        <section
          className={"hand-zone"+(specialHand.length?" has-specials":"")+(handExpanded?" is-open":"")}
          aria-label="Tu mano"
          style={{backgroundImage:`linear-gradient(0deg,#111713e8,#1d241bd9),url("${championBackgroundUrl(game.player.champion.faction)}")`}}
        >
          <button type="button" className="arena-hand-toggle" aria-expanded={handExpanded}
            aria-label={handExpanded?"Contraer mano":"Desplegar mano"}
            onClick={()=>{setHandExpanded(!handExpanded);setHoveredHandIndex(null);}}>
            <span className="arena-hand-toggle-handle" aria-hidden="true"/>
            <span>{handExpanded?"CERRAR MANO":"ABRIR MANO"}</span>
            <span className="arena-hand-toggle-chevron" aria-hidden="true">{handExpanded?"⌄":"⌃"}</span>
          </button>
          {hoveredHandIndex!==null && hand[hoveredHandIndex] && !drag && (
            <div className="arena-card-hover-preview" aria-hidden="true">
              <CardFace card={hand[hoveredHandIndex]}/>
            </div>
          )}
          <div className="hand-label">
            <span>TU MANO</span>
            <small>{hand.length} cartas</small>
          </div>
          {specialError && <span className="special-error" role="alert">{specialError}</span>}
          {specialMode==="relic" && <span className="manifest-special-hint">RELIQUIA · ELEGÍ UNA POSICIÓN VACÍA</span>}
          {specialMode==="symmetry" && <span className="manifest-special-hint">
            {symmetryTargets.length
              ? "SIMETRÍA · TOCÁ LA CARTA RIVAL QUE QUERÉS COPIAR"
              : "SIMETRÍA · EL RIVAL AÚN NO TIENE ESPECIALES VISIBLES"}
          </span>}
          <div className="hand-layout">
           <div className="hand" key={game.round}>
            {hand.map((card,index)=>(
              <button
                className={`hand-card ${selectedIndex===index?"is-selected":""}`}
                type="button"
                key={`${card.id}-${index}`}
                style={{animationDelay:`${index*115}ms`}}
                disabled={game.phase!=="awaiting_player" || !!duelPreview}
                onPointerEnter={()=>setHoveredHandIndex(index)}

                onPointerLeave={()=>setHoveredHandIndex(current=>current===index?null:current)}

                onFocus={()=>setHoveredHandIndex(index)}

                onBlur={()=>setHoveredHandIndex(current=>current===index?null:current)}

                onPointerDown={event=>{

                  if(!handExpanded && event.pointerType!=="mouse" && window.matchMedia("(min-width:761px)").matches){
                     setHandExpanded(true);return;
                   }

                  handlePointerDown(event,index);

                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={()=>{
                  setDrag(null);
                  setHoveredPosition(null);
                }}
              >
                <CardFace card={card} selected={selectedIndex===index} />
              </button>
            ))}
            {hand.length===0 && <div className="empty-hand">Sin cartas disponibles.</div>}
          </div>
          {!!specialHand.length && <aside className="manifest-hand" aria-label="Mano de cartas especiales">
            <div className="manifest-hand-heading"><span>ESPECIALES</span><span>{specialHand.length} CARTAS</span></div>
            <div className="manifest-hand-cards">
              {specialHand.map((kind,index)=>{
                const daggerNumber=kind==="dagger" ? specialHand.slice(0,index+1).filter(k=>k==="dagger").length : 0;
                const chosen=kind==="dagger" ? daggerNumber<=daggersToUse : specialMode===kind;
                const canUse=game.phase==="awaiting_player" && !duelPreview;
                return <div className="manifest-hand-entry" key={kind+"-"+index}>
                  <button type="button" draggable={kind==="relic"&&canUse}
                    className={"manifest-hand-card"+(chosen?" is-selected":"")}
                    disabled={!canUse}
                    title={kind==="dagger" ? "Equipar Daga Etérea · +1 Poder con tu próxima carta"
                      : kind==="relic" ? "Colocar Reliquia en una posición" : "Copiar una carta especial rival"}
                    aria-pressed={chosen}
                    aria-label={SPECIAL_NAME[kind]+(kind==="dagger"?" · "+daggerNumber+" de "+availableDaggers:"")}
                    onDragStart={event=>{
                      if(kind==="relic"){
                        setSpecialMode("relic");
                        event.dataTransfer.setData("text/plain","daggerlight-relic");
                        event.dataTransfer.effectAllowed="move";
                      }
                    }}
                    onClick={()=>{
                      setSpecialError("");
                      if(kind==="dagger"){
                        setSpecialMode(null);
                        setDaggersToUse(chosen?daggerNumber-1:daggerNumber);
                      }else{
                        setDaggersToUse(0);
                        if(kind==="relic"||kind==="symmetry")setSpecialMode(specialMode===kind?null:kind);
                        else setSpecialInspection(kind);
                      }
                    }}>
                    <ManifestCard kind={kind} size="hand" selected={chosen}/>
                  </button>
                  <button type="button" className="manifest-info-button"
                    title={"Inspeccionar "+SPECIAL_NAME[kind]}
                    aria-label={"Ver habilidad de "+SPECIAL_NAME[kind]}
                    onClick={()=>setSpecialInspection(kind)}>i</button>
                </div>;
              })}
            </div>
          </aside>}
          </div>
        </section>

          </div>
        </div>

        {specialInspection && <ManifestCardDialog kind={specialInspection} onClose={()=>setSpecialInspection(null)}/>}

        {inspection && (
          <div
            className="card-zoom-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={inspection.card.name}
            onClick={()=>setInspection(null)}
          >
            <div className="card-zoom-panel" onClick={event=>event.stopPropagation()}>
              <button
                className="zoom-close"
                type="button"
                aria-label="Cerrar carta"
                onClick={()=>setInspection(null)}
              >×</button>
              <div className="zoom-card-frame">
                <CardFace
                  card={inspection.card}
                  finalPower={inspection.finalPower}
                  powerExact={inspection.powerExact!==false}
                  livePower={inspection.finalPower!==undefined || inspection.powerExact===false}
                />
              </div>
              {inspection.card.trait && <p className="manifest-inspect-rule">
                 <strong>{inspection.card.trait.toUpperCase()}</strong> · {SPECIAL_TEXT[
                   inspection.card.trait.startsWith("Portaanillos")?
                     inspection.card.trait.includes("Sinistral")?"shield":"dagger":
                     inspection.card.trait==="Objeto mágico"?"relic":"symmetry"
                 ]}
               </p>}
               <div className="zoom-actions">
                <div>
                  <strong>{inspection.card.name}</strong>
                  <span>
                    Poder impreso {inspection.card.power}
                    {inspection.powerExact===false
                      ? " · Poder final pendiente"
                      : inspection.finalPower!==undefined
                        ? ` · Poder final ${inspection.finalPower}`
                        : ""}
                  </span>
                </div>
                {game.phase==="awaiting_player" && inspection.handIndex!==undefined && !duelPreview && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={()=>{
                      setSelectedIndex(inspection.handIndex!);
                      setInspection(null);
                    }}
                  >SELECCIONAR</button>
                )}
              </div>
            </div>
          </div>
        )}

        {game.phase==="awaiting_quiero" && !duelPreview && (
          <div className="decision-overlay">
            <div className="decision-card">
              <span>VAS 0–2</span>
              <strong>¿Quiero?</strong>
              <p>Jugá el tercer duelo para intentar rescatar un punto, o cerrá la ronda 0–2.</p>
              <div>
                <button className="secondary-button" onClick={()=>chooseQuiero(false)}>NO QUIERO</button>
                <button className="primary-button" onClick={()=>chooseQuiero(true)}>QUIERO</button>
              </div>
            </div>
          </div>
        )}

        {game.phase==="finished" && !duelPreview && (
          <div className={"decision-overlay match-conclusion-stage"+(finalStep==="ceremony"?" is-ceremony":" is-actions")}>
            {finalStep==="ceremony" ? (
              <div className={"match-conclusion-ceremony match-final-"+game.winner} role="status" aria-live="polite">
                <span className="match-conclusion-symbol" aria-hidden="true">{game.winner==="player"?"✦":game.winner==="opponent"?"◇":"◈"}</span>
                <span className="match-conclusion-kicker">{arcadeRun
                  ? arcadeRun.status==="complete"?"ARCADE COMPLETADO"
                    : `ARCADE · ${arcadeRun.index+1}/${arcadeRun.opponents.length}`
                  : "FIN DE PARTIDA"}</span>
                <strong>{arcadeRun?.status==="complete"?"TODOS DERROTADOS":game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE"}</strong>
                <span className="match-conclusion-score">{game.player.life} — {game.opponent.life} VIDA</span>
                <button type="button" className="match-conclusion-continue" onClick={()=>{clearFinalTimer();setFinalStep("actions");}}>CONTINUAR →</button>
              </div>
            ) : (
              <div className="decision-card match-postgame" role="group" aria-label="Opciones después de la partida">
                <span>{arcadeRun?"MODO ARCADE":"PARTIDA FINALIZADA"}</span>
                <strong>{arcadeRun?.status==="complete"?"ARCADE COMPLETADO":game.winner==="player"?"GANASTE":game.winner==="opponent"?"GANÓ LA IA":"EMPATE"}</strong>
                {arcadeRun ? <>
                  <p>Derrotaste {arcadeRun.victories.length} de {arcadeRun.opponents.length} rivales.
                    {arcadeRun.status==="active"?" Prepará el siguiente enfrentamiento.":arcadeRun.status==="lost"?" Tu racha terminó.":" ¡Conquistaste el Arcade!"}</p>
                  <div className="arcade-progress-dots" aria-label="Progreso arcade">
                    {arcadeRun.opponents.map((id,index)=><span key={id}
                      className={arcadeRun.victories.includes(id)?"is-won":index===arcadeRun.index?"is-current":""}
                      title={championShortName(champions[id].name)} aria-hidden="true"/>)}
                  </div>
                  <div className="match-postgame-actions">
                    <button className="secondary-button" type="button" onClick={()=>goToMenu("home")}>MENÚ</button>
                    {arcadeRun.status==="active" && game.winner==="player"
                      ? <button className="primary-button" type="button" onClick={continueArcade}>SIGUIENTE RIVAL →</button>
                      : <button className="primary-button" type="button" onClick={beginMatch}>REINICIAR ARCADE</button>}
                  </div>
                </> : <>
                  <p>{game.player.life}–{game.opponent.life} de Vida · {game.round} ronda{game.round===1?"":"s"}.</p>
                  <div className="match-postgame-actions">
                    <button className="secondary-button" type="button" onClick={()=>goToMenu("champions")}>CAMBIAR CAMPEÓN</button>
                    <button className="primary-button" type="button" onClick={beginMatch}>REVANCHA</button>
                  </div>
                </>}
              </div>
            )}
          </div>
        )}

      </div>

      {tutorialOpen && <Tutorial inGame onClose={()=>setTutorialOpen(false)} onPlay={()=>setTutorialOpen(false)} />}
      {drag && (() => {
        const card=hand[drag.handIndex];
        if (!card || !drag.moved) return null;
        return (
          <div
            className="drag-layer"
            style={{transform:`translate3d(${drag.x}px, ${drag.y}px, 0)`}}
          >
            <CardFace card={card} ghost />
          </div>
        );
      })()}
    </main>
  );
}
