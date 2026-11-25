import { createPortal, flushSync } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArchiveFlight, CardFlight, DealMotion, MatchEntryMotion, handCardRect, visibleHand, visibleRoundPlays } from "./board-redesign/motion";
import type { BoardMotionSequence } from "./board-redesign/motion";
import { ArchiveReceiptTransition, RoundTransition, archiveCountChange, completedRoundReceipt } from "./board-redesign/roundChoreography";
import { DuelResultStinger, MatchFinaleBanner, NewRoundStinger } from "./board-redesign/stingerMotion";
import { QuieroChoiceStage, RivalQuieroStage, rivalAcceptedQuiero, shouldOfferQuiero } from "./board-redesign/quieroChoreography";
import { DUEL_BEATS, DUEL_FINISH_MS, duelPowerReasons, powerIsRevealed, powerSourceCues, postDuelChampionCues } from "./board-redesign/duelChoreography";
import type { DuelBeat } from "./board-redesign/duelChoreography";
import { playDuelCue, unlockDuelAudio, setDuelVolume } from "./board-redesign/duelAudio";
import SettingsPanel from "./SettingsPanel";
import { readPreferences, writePreferences, shouldReduceMotion } from "./preferences";
import type { GamePreferences } from "./preferences";
import { disableManifestations } from "./board-redesign/disableManifestations";
import Tutorial from "./Tutorial";
import { TUTORIAL_MATCH, guidedOpeningHint, hasSeenWelcome, rememberWelcome } from "./onboarding";
import { OpeningGuide, WelcomeMatch } from "./WelcomeMatch";
import SplashScreen from "./SplashScreen";
import Multiplayer from "./Multiplayer";
import PlaytestHub from "./PlaytestHub";
import { downloadPlaytest, saveAiMatch } from "./playtestStorage";
import { MatchFeedback } from "./MatchFeedback";
import { buildMatchFeedback, feedbackAvailable, submitMatchFeedback } from "./matchFeedback";
import type { MatchFeedbackAnswers } from "./matchFeedback";
import ThemeToggle from "./ThemeToggle";
import AuguryStatus from "./AuguryStatus";
import { factionArtUrl } from "./factionArtwork";
import { championImageUrl,championBackgroundUrl,championShortName } from "./championArtwork";
import { cleanPlayerName,readPlayerName,writePlayerName,DEFAULT_PLAYER_NAME } from "./playerProfile";
import { newArcadeRun,readArcadeRun,writeArcadeRun,arcadeOpponent,markArcadeResult,advanceArcade } from "./arcade";
import type { ArcadeRun } from "./arcade";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import { HomeScreen, ChampionPicker, CardCollection } from "./FrontOffice";
import PhysicalTable from "./PhysicalTable";
import DeckLibrary from "./DeckLibrary";
import PlayerProfile from "./PlayerProfile";
import { starterDeckLabel } from "./profileStatistics";
import { makeMonoDeckDefinition } from "./engine/decks";
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
import { HybridSidebar, HybridPhoneChampion, HybridRightRail, HybridCommandRail, HybridEngraving } from "./board-redesign/HybridBoardHardware";
import { appendMatchHistory, clearSavedMatch, completedMatch, newSavedMatch, readMatchHistory, readSavedMatch, writeSavedMatch } from "./persistence";
import type { SavedMatch } from "./persistence";
import { analyticsAvailable, analyticsOptedIn, sendCompletedMatch, setAnalyticsConsent } from "./telemetry";
import type { CardDefinition, Faction, Position } from "./types";

const PHONE_BOARD_QUERY="(max-width: 760px)";

function subscribePhoneBoard(onChange:()=>void) {
  const viewport=window.matchMedia(PHONE_BOARD_QUERY);
  viewport.addEventListener("change",onChange);
  return ()=>viewport.removeEventListener("change",onChange);
}

function isPhoneBoard() {
  return window.matchMedia(PHONE_BOARD_QUERY).matches;
}

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

export function CardFace({
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


function DuelPowerCard({played,side,beat,outcome}:{
  played:EnginePlay;side:"player"|"opponent";beat:DuelBeat;outcome:"player"|"opponent"|"draw";
}) {
  const printed=played.card.power;
  const final=played.finalPower??printed;
  const delta=final-printed;
  const resolved=powerIsRevealed(beat,side);
  const hasImpact=beat==="impact"||beat==="result"||beat==="settle";
  const role=hasImpact&&outcome!=="draw"?(outcome===side?" is-duel-winner":" is-duel-loser"):"";
  return (
    <div className={"duel-showcase-card duel-choreo-side-"+side+role+
      (resolved?" power-resolved":"")+
      (delta>0?" board-gs-gain":delta<0?" board-gs-loss":"")}
      data-duel-side={side} data-power-state={resolved?"final":"printed"}
      aria-label={played.card.name+", Poder "+(resolved?final:printed)}>
      <span className="duel-showcase-side">{side==="player"?"TU CARTA":"RIVAL"}</span>
      <div className="duel-showcase-change">
        {resolved&&delta!==0&&<div className={"dl-live-power-cue"+(delta<0?" is-loss":"")} aria-hidden="true">
          <i/><i/><span>{formatPowerDelta(played)}</span>
        </div>}
      </div>
      <div className="duel-showcase-face">
        <CardFace card={played.card}/>
        <div className={"duel-showcase-power"+(delta<0?" is-loss":delta>0?" is-gain":" is-neutral")} aria-live="off">
          <small>PODER</small>
          <strong key={resolved?"final":"printed"}>{resolved?final:printed}</strong>
        </div>
      </div>

    </div>
  );
}

function DuelEffectsPanel({played,side,beat}:{played:EnginePlay;side:"player"|"opponent";beat:DuelBeat}) {
  const revealed=powerIsRevealed(beat,side);
  const reasons=duelPowerReasons(played);
  const effect=playEffectFeedback(played);
  const lines=revealed?reasons.visible:[];
  const show=lines.length>0||revealed&&reasons.hidden>0||revealed&&effect==="inactive"&&played.card.effect==="augury_match3";
  return <aside className={"duel-effect-column duel-effect-column-"+side+(show?" has-effects":"")}
    aria-label={side==="player"?"Modificadores de tu carta":"Modificadores de la carta rival"}>
    {show&&<>
      <span className="duel-effect-column-kicker">{side==="player"?"TU PODER":"PODER RIVAL"}</span>
      {lines.map((note,index)=><span key={index} className={"duel-effect-note "+
        (note.startsWith("−")||note.startsWith("-")?"is-penalty":note.startsWith("+")?"is-bonus":"is-neutral")}
        title={note}>{note}</span>)}
      {reasons.hidden>0&&<span className="duel-effect-remaining" title={(played.notes??[]).join(" · ")}>
        {reasons.hidden} efecto{reasons.hidden===1?"":"s"} más</span>}
    </>}
  </aside>;
}

function DuelCardsPresentation({duel,onAdvance,auguryEvents,beat,outcome=null,before=null,after=null,guideMount,onSkipGuide}:{
  duel:DuelSummary;onAdvance:()=>void;auguryEvents:string[];beat:DuelBeat;
  outcome?:"player"|"opponent"|"draw"|null;
  before?:GameState|null;after?:GameState|null;
  guideMount?:HTMLElement|null;onSkipGuide?:()=>void;
}) {
  const guided=!!guideMount;
  const overlayRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const overlay=overlayRef.current;
    const root=overlay?.closest(".app-shell.board-redesign-v1");
    if(!root||!overlay||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const animated:Animation[]=[];
    const cards=Array.from(overlay.querySelectorAll<HTMLElement>(".duel-showcase-card"));
    const entries=[
      {side:"player",position:duel.playerPlay.position},
      {side:"opponent",position:duel.opponentPlay.position}
    ];
    entries.forEach(({side,position},index)=>{
      const target=cards[index];
      const source=root.querySelector<HTMLElement>(
        `.board-slot.${side}[data-position="${position}"] .current-board-card`
      );
      const start=source?.getBoundingClientRect();
      const end=target?.getBoundingClientRect();
      if(!target||!start||!end||!start.width||!end.width)return;
      const dx=start.left+start.width/2-(end.left+end.width/2);
      const dy=start.top+start.height/2-(end.top+end.height/2);
      const sx=Math.min(1.5,start.width/end.width);
      const sy=Math.min(1.5,start.height/end.height);
      animated.push(target.animate([
        {transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,
          opacity:.95,filter:"drop-shadow(1px 4px 4px #0007)",offset:0},
        {transform:`translate3d(${dx*.1}px,${dy*.15-13}px,0) scale(1.06)`,
          opacity:1,filter:"drop-shadow(4px 24px 22px #0008)",offset:.76},
        {transform:"translate3d(0,0,0) scale(1)",
          opacity:1,filter:"drop-shadow(3px 14px 13px #0009)",offset:1}
      ],{duration:1180,delay:index*120,easing:"cubic-bezier(.2,.75,.26,1)",fill:"both"}));
    });
    return ()=>animated.forEach(animation=>animation.cancel());
  },[duel]);

  // A final purposeful movement takes both original CardFaces back to their
  // measured slots. If this was the last duel, ArchiveFlight begins afterward.
  useLayoutEffect(()=>{
    if(beat!=="settle"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const overlay=overlayRef.current;
    const root=overlay?.closest(".app-shell.board-redesign-v1");
    if(!overlay||!root)return;
    const animations:Animation[]=[];
    (["player","opponent"] as const).forEach(side=>{
      const play=side==="player"?duel.playerPlay:duel.opponentPlay;
      const card=overlay.querySelector<HTMLElement>(".duel-choreo-side-"+side);
      const source=root.querySelector<HTMLElement>(
        '.board-slot.'+side+'[data-position="'+play.position+'"] .current-board-card'
      );
      const from=card?.getBoundingClientRect(),to=source?.getBoundingClientRect();
      if(!card||!from||!to||!from.width||!to.width)return;
      const dx=to.left+to.width/2-(from.left+from.width/2);
      const dy=to.top+to.height/2-(from.top+from.height/2);
      animations.push(card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1},
        {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+(to.width/from.width)+','+(to.height/from.height)+')',opacity:.06}
      ],{duration:510,easing:"cubic-bezier(.34,.02,.65,1)",fill:"both"}));
    });
    return ()=>animations.forEach(a=>a.cancel());
  },[beat,duel]);

  // The engine already resolved the duel. These temporary highlights are
  // visual pointers to its actual notes or an observed Champion state change.
  const sourceTimers=useRef<number[]>([]);
  const sourceNodes=useRef<Array<{node:HTMLElement;cls:string}>>([]);
  useEffect(()=>()=> {
    sourceTimers.current.forEach(timer=>window.clearTimeout(timer));
    sourceNodes.current.forEach(({node,cls})=>node.classList.remove(cls));
  },[]);
  useEffect(()=>{
    if(beat!=="player-power"&&beat!=="opponent-power"&&beat!=="impact")return;
    const root=overlayRef.current?.closest(".app-shell.board-redesign-v1");
    if(!root)return;
    const cues=beat==="impact"
      ? postDuelChampionCues(before,after,duel)
      : powerSourceCues(duel,beat==="player-power"?"player":"opponent",
          (before??after)?.[beat==="player-power"?"player":"opponent"].champion.id??"");
    cues.forEach(cue=>{
      const selector=cue.kind==="champion"?
        ".hybrid-champion-panel."+cue.side:
        '.board-slot.'+cue.side+'[data-position="'+cue.position+'"]'+
          (cue.kind==="archive"?" .archive-count":"");
      const node=root.querySelector<HTMLElement>(selector);
      if(!node)return;
      const cls="duel-source-"+cue.kind;
      node.classList.add(cls);
      sourceNodes.current.push({node,cls});
      sourceTimers.current.push(window.setTimeout(()=>node.classList.remove(cls),940));
    });
  },[beat,duel,before,after]);
  const comparing=beat==="compare"||beat==="impact";
  const comparison=comparing&&<div className="duel-choreo-comparison" role="status">
    PODER FINAL · {duel.playerPlay.finalPower??duel.playerPlay.card.power} — {duel.opponentPlay.finalPower??duel.opponentPlay.card.power}
  </div>;
  const presentation=(
    <div ref={overlayRef} data-duel-beat={beat}
      className={"duel-showcase-overlay duel-choreo duel-beat-"+beat+(outcome?" is-board-outcome":"")+
        (guided?" is-guided-duel":"")}
      role="dialog" aria-modal="true" aria-label="Resolución de Poder de las cartas">
      <div className="duel-focus-screen" aria-hidden="true"/>
      {outcome&&beat==="result"&&<DuelResultStinger duel={duel} onComplete={onAdvance} held={guided}
        bannerImage={after?championBackgroundUrl(after.player.champion.faction):undefined}>
        {guided&&<div className="dl-guide-duel-actions">
          <button type="button" className="duel-showcase-skip" autoFocus onClick={onAdvance}>CONTINUAR →</button>
          <button type="button" className="dl-guide-duel-exit" onClick={onSkipGuide}>Saltar guía</button>
        </div>}
      </DuelResultStinger>}
      {outcome&&beat==="settle"&&<span className="arena-visually-hidden" role="status">
        {duel.outcome==="player"?"VICTORIA":duel.outcome==="opponent"?"DERROTA":"EMPATE"}
      </span>}
      <div className="duel-showcase-pair">
        <DuelEffectsPanel played={duel.playerPlay} side="player" beat={beat}/>
        <DuelPowerCard played={duel.playerPlay} side="player" beat={beat} outcome={duel.outcome}/>
        <DuelPowerCard played={duel.opponentPlay} side="opponent" beat={beat} outcome={duel.outcome}/>
        <DuelEffectsPanel played={duel.opponentPlay} side="opponent" beat={beat}/>
      </div>
      {guided ? beat==="compare"&&<div className="dl-guide-duel-footer">
        {comparison}
        <p className="dl-guide-duel-note">Compará los números y revisá qué cambió el Poder de cada carta.</p>
        <div className="dl-guide-duel-actions">
          <button type="button" className="duel-showcase-skip" autoFocus onClick={onAdvance}>VER RESULTADO →</button>
          <button type="button" className="dl-guide-duel-exit" onClick={onSkipGuide}>Saltar guía</button>
        </div>
      </div> : <>
        {comparison}
        {(beat==="compare"||beat==="impact"||beat==="result")&&auguryEvents.length>0&&
          <div className="duel-showcase-events">{auguryEvents.map((event,index)=><span key={index}>{event}</span>)}</div>}
        <button type="button" className="duel-showcase-skip" onClick={onAdvance}>
          {outcome?"CONTINUAR →":"SALTAR A RESULTADO →"}
        </button>
      </>}
    </div>
  );
  return guideMount?createPortal(presentation,guideMount):presentation;
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
  const label=side==="player"?(playerName?.trim()&&playerName!=="JUGADOR"?playerName.trim():DEFAULT_PLAYER_NAME):"RIVAL";
  return (
    <section className={`champion-bar arena-champion ${side} faction-illustrated faction-${faction}${active?" is-active":""}`}>
      <button className="arena-champion-portrait" type="button"
        style={{backgroundImage:`url("${championBackgroundUrl(faction)}")`}}
        aria-label={`${label}: ${championShortName(name)}. ${life} Vida. Tocá para ver la habilidad.`}
        aria-expanded={expanded}
        onClick={()=>setExpanded(!expanded)}>
        <img className="arena-champion-figure" src={championImageUrl(championId,true)}
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

export function Slot({
  side,
  position,
  cards,
  pendingCard,
  focusPlay,
  archive,
  archiveUpdated = false,
  active,
  capacityValue,
  manifestations,
  archiveCards,
  onTap,
  onInspect,
  onPreview,
  onManifestInspect,
  onCopyTarget,
  onCopyArchive,
  onDropRelic,
  hideFocusDuringFlight = false,
  phoneBoard = false
}: {
  side: "player" | "opponent";
  position: Position;
  cards: EnginePlay[];
  pendingCard?: EnginePlay | null;
  focusPlay?: EnginePlay | null;
  archive: number;
  archiveUpdated?: boolean;
  active: boolean;
  capacityValue: number;
  manifestations?: ActiveManifestation[];
  archiveCards?: CardDefinition[];
  onTap?: () => void;
  onInspect: (played:EnginePlay)=>void;
  onPreview?: (card:CardDefinition|null)=>void;
  onManifestInspect: (kind:SpecialKind)=>void;
  onCopyTarget?: (target:CopyTarget)=>void;
  onCopyArchive?: ()=>void;
  onDropRelic?: ()=>void;
  hideFocusDuringFlight?: boolean;
  phoneBoard?: boolean;
}) {
  // A design can be played twice in one position. Only the most recent matching
  // resolved play gets the active-card rendering, never every matching copy.
  // A pending opening is not in roundPlays even if its artwork matches.
  const focusedIndex=focusPlay && !pendingCard
    ? cards.reduce((last,played,index)=>samePlay(played,focusPlay)?index:last,-1)
    : -1;
  const focusAlreadyInCards=focusedIndex>=0;
  const fieldCards=(manifestations||[]).filter(token=>token.position===position);
  const archivedKind=archiveCards?.find(card=>card.specialArchiveKind==="dagger")?.specialArchiveKind
    ||archiveCards?.find(card=>card.specialArchiveKind==="relic")?.specialArchiveKind;
  return (
    <div
      className={`board-slot ${side} ${active ? "drop-active" : ""}${archiveUpdated ? " archive-updated" : ""}`}
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
      {phoneBoard && active && <button type="button" className="hybrid-phone-place"
        aria-label={`Jugar en ${positionLabels[position]}`}/>}
      {archivedKind
        ? <button type="button" className="archive-count manifest-archive-button"
          aria-label={`Archivo: ${archive} cartas. ${onCopyArchive&&archiveCards?.some(card=>card.specialArchiveKind==="dagger") ? "Copiar Daga Etérea" : "Inspeccionar carta especial"}`}
          title={onCopyArchive&&archiveCards?.some(card=>card.specialArchiveKind==="dagger")
            ? "Copiar una Daga Etérea archivada con Simetría Perfecta"
            : "Inspeccionar carta especial archivada"}
          onClick={event=>{
            event.stopPropagation();
            if(onCopyArchive&&archiveCards?.some(card=>card.specialArchiveKind==="dagger"))
              onCopyArchive();
            else onManifestInspect(archivedKind);
          }}><span className="archive-caption">ARCHIVO </span>{archive}</button>
        : <span className="archive-count" title="Archivo" aria-label={`Archivo: ${archive} cartas`}><span className="archive-caption">ARCHIVO </span>{archive}</span>}
      <span className="slot-capacity" title="Capacidad" aria-label={`Ocupación: ${cards.length} de ${capacityValue}`}>{cards.length}/{capacityValue}</span>
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
              <div className={"played-card"+(hideFocusDuringFlight&&index===focusedIndex?" is-motion-landing":"")} key={`${played.card.id}-${index}`}
                onMouseEnter={()=>onPreview?.(played.card)}
                onMouseLeave={()=>onPreview?.(null)}
                onFocusCapture={()=>onPreview?.(played.card)}
                onBlurCapture={()=>onPreview?.(null)}>
                {index===focusedIndex ? (
                  <CurrentBoardCard played={played} onInspect={onInspect} />
                ) : (
                  <BattleCard played={played} onInspect={onInspect} />
                )}
              </div>
            ))}
            {focusPlay && !focusAlreadyInCards && (
              <div className={"played-card current-play"+(hideFocusDuringFlight?" is-motion-landing":"")}
                onMouseEnter={()=>onPreview?.(focusPlay.card)}
                onMouseLeave={()=>onPreview?.(null)}>
                <CurrentBoardCard played={focusPlay} onInspect={onInspect} pending={!!pendingCard} />
              </div>
            )}
            {pendingCard && !samePlay(pendingCard,focusPlay) && (
              <div className="played-card pending-play"
                onMouseEnter={()=>onPreview?.(pendingCard.card)}
                onMouseLeave={()=>onPreview?.(null)}>
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
  const [screen,setScreen]=useState<"home"|"champions"|"arcade"|"collection"|"table"|"decklab"|"multiplayer"|"playtest"|"profile">("home");
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [preferences,setPreferences]=useState<GamePreferences>(readPreferences);
  const audioEnabled=preferences.audioEnabled;
  function changePreferences(next:GamePreferences) {
    setPreferences(next);
    writePreferences(next);
    setDuelVolume(next.volume / 100);
  }
  useEffect(()=>{
    setDuelVolume(preferences.volume / 100);
    document.documentElement.dataset.daggerlightMotion=preferences.motion;
  },[preferences.volume,preferences.motion]);
  const [playerName,setPlayerName]=useState(()=>readPlayerName());
  const [boardRedesign,setBoardRedesign]=useState(()=>new URLSearchParams(window.location.search).get("board")!=="classic");
  const narrowBoard=useSyncExternalStore(subscribePhoneBoard,isPhoneBoard,()=>false);
  const phoneBoard=boardRedesign&&narrowBoard;
  const [phoneToolsOpen,setPhoneToolsOpen]=useState(false);
  const [handExpanded,setHandExpanded]=useState(false);
  const [hoveredHandIndex,setHoveredHandIndex]=useState<number|null>(null);
  const [hoveredBoardCard,setHoveredBoardCard]=useState<CardDefinition|null>(null);
  const [auguryOpen,setAuguryOpen]=useState(false);
  const [arcadeRun,setArcadeRun]=useState<ArcadeRun|null>(()=>readArcadeRun());
  const [hasEntered,setHasEntered]=useState(false);
  const [welcomeSeen,setWelcomeSeen]=useState(hasSeenWelcome);
  const [guidedOpening,setGuidedOpening]=useState(false);
  const [game,setGame]=useState<GameState|null>(null);
  const [savedMatch,setSavedMatch]=useState<SavedMatch|null>(()=>readSavedMatch());
  const [matchMeta,setMatchMeta]=useState<SavedMatch|null>(null);
  const [currentDeck,setCurrentDeck]=useState<DeckDefinition|null>(null);
  const [history,setHistory]=useState(()=>readMatchHistory());
  const [analyticsConsent,setTelemetryOn]=useState(()=>analyticsOptedIn());
  const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
  const [inspection,setInspection]=useState<Inspection|null>(null);
  const inspectionTrigger=useRef<HTMLButtonElement|null>(null);
  const phoneHandInspection=phoneBoard&&inspection?.handIndex!==undefined;
  const [duelPreview,setDuelPreview]=useState<DuelSummary|null>(null);
  const [boardMotion,setBoardMotion]=useState<BoardMotionSequence|null>(null);
  const guidedRound=guidedOpening&&(boardMotion?.before.round??game?.round)===1;
  const guidedHandInspection=guidedRound&&inspection?.handIndex!==undefined;
  const boardMotionRef=useRef<BoardMotionSequence|null>(null);
  const arenaMainRef=useRef<HTMLDivElement>(null);
  const [archiveArrivals,setArchiveArrivals]=useState<Record<string,number>>({});
  const nextMotionId=useRef(0);
  const [quieroChoice,setQuieroChoice]=useState<boolean|null>(null);
  const quieroChoiceTimer=useRef<number|null>(null);
  const quieroPending=useRef(false);
  const rivalQuieroPending=useRef(false);
  function clearQuieroDecision(){
    if(quieroChoiceTimer.current!==null)window.clearTimeout(quieroChoiceTimer.current);
    quieroChoiceTimer.current=null;
    quieroPending.current=false;
    rivalQuieroPending.current=false;
    setQuieroChoice(null);
  }
  useEffect(()=>()=>{if(quieroChoiceTimer.current!==null)window.clearTimeout(quieroChoiceTimer.current);},[]);
  function setMotion(next:BoardMotionSequence|null){
    if(next?.id!==boardMotionRef.current?.id)setArchiveArrivals({});
    boardMotionRef.current=next;
    setBoardMotion(next);
  }
  const [preDuel,setPreDuel]=useState<DuelPublicSnapshot|null>(null);
  const [duelStep,setDuelStep]=useState<"cards"|"result">("cards");
  const [duelBeat,setDuelBeat]=useState<DuelBeat>("approach");
  const duelTimelineTimers=useRef<number[]>([]);
  const audioEnabledRef=useRef(audioEnabled);
  audioEnabledRef.current=audioEnabled;
  const [finalStep,setFinalStep]=useState<"ceremony"|"feedback"|"actions">("ceremony");
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
  const specialHand=game?.manifestationsEnabled===false?[]:(game?.player.specialHand||[]);
  const availableDaggers=specialHand.filter(kind=>kind==="dagger").length;
  const symmetryTargets=game&&game.manifestationsEnabled!==false?copyTargets(game.opponent):[];

  const hand=boardRedesign ? visibleHand(boardMotion,game?.player.hand ?? []) : (game?.player.hand ?? []);
  const selectedCard=useMemo(
    ()=>selectedIndex===null ? null : hand[selectedIndex] ?? null,
    [hand,selectedIndex]
  );

  function clearPreviewTimer() {
    duelTimelineTimers.current.forEach(timer=>window.clearTimeout(timer));
    duelTimelineTimers.current=[];
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
    return shouldReduceMotion(preferences.motion);
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
    const sequence=boardMotionRef.current;
    if(sequence){
      if(boardRedesign && sequence.roundEnded && sequence.phase==="duel"){
        setMotion({...sequence,phase:"round"});
      }else if(boardRedesign && rivalQuieroPending.current && sequence.phase==="duel"){
        // This only happens if the engine actually recorded "IA: Quiero."
        // after a 2–0 player lead. Keep the board frozen for one brief answer.
        setMotion({...sequence,phase:"quiero-ai"});
      }else setMotion(null);
    }
    rivalQuieroPending.current=false;
    if (finishingMatch.current) {
      finishingMatch.current=false;
      startFinalCeremony();
    }
  }

  function showDuelResult() {
    clearPreviewTimer();
    setDuelStep("result");
    if(boardRedesign){
      if(guidedRound){
        setDuelBeat("result");
        if(duelPreview&&!isReducedMotion())
          playDuelCue(duelPreview.outcome==="player"?"victory":duelPreview.outcome==="opponent"?"defeat":"draw",audioEnabledRef.current);
        return;
      }
      setDuelBeat("result");
      if(isReducedMotion()){
        duelTimelineTimers.current.push(window.setTimeout(finishDuelPresentation,1050));
      }else{
        duelTimelineTimers.current.push(window.setTimeout(()=>setDuelBeat("settle"),1270));
        duelTimelineTimers.current.push(window.setTimeout(finishDuelPresentation,1810));
      }
    }else{
      previewTimer.current=window.setTimeout(finishDuelPresentation,isReducedMotion()?180:1400);
    }
  }

  function settleDuelPresentation() {
    clearPreviewTimer();
    if(!boardRedesign||isReducedMotion()){finishDuelPresentation();return;}
    setDuelBeat("settle");
    duelTimelineTimers.current.push(window.setTimeout(finishDuelPresentation,540));
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
    setGuidedOpening(false);
    const saved=readSavedMatch();
    if(!saved){setSavedMatch(null);return;}
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    setMotion(null);
    setPlayerChampion(saved.game.player.champion.id);
    setOpponentChampion(saved.rivalSelection);
    setAiDifficulty(saved.game.aiDifficulty??"normal");
    setMatchMeta(saved);
    setCurrentDeck(saved.game.player.deckRecipe?{
      id:saved.deckIdentity?.id??("restored-"+saved.game.player.champion.id),
      name:saved.deckIdentity?.name??"Mazo recuperado",
      championId:saved.game.player.champion.id,
      cardIds:[...saved.game.player.deckRecipe]
    }:null);
    setGame(disableManifestations(cloneGame(saved.game)));
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
    deck?:DeckDefinition|null, fromArcade=false, guided=false) {
    setGuidedOpening(guided);
    if(!fromArcade){
      setArcadeRun(null);
      writeArcadeRun(null);
    }
    clearPreviewTimer();
    clearFinalTimer();
    clearQuieroDecision();
    finishingMatch.current=false;
    setMotion(null);
    const opponent = rivalSelection==="random"
      ? championIds.filter(id=>id!==championId)[Math.floor(Math.random()*(championIds.length-1))]
      : rivalSelection;
    setPlayerChampion(championId);
    setOpponentChampion(rivalSelection);
    setAiDifficulty(difficulty);
    const next=disableManifestations(startGame(championId,opponent,Math.random,guided?"player":undefined,difficulty,deck?{player:deck}:undefined,false));
    if(boardRedesign&&!isReducedMotion()){
      setMotion({id:++nextMotionId.current,phase:"match-entry",before:next,
        duel:null,roundEnded:false,handIndex:null,origin:null});
    }
    setCurrentDeck(deck??null);
    const chosenDeck=deck??makeMonoDeckDefinition(championId);
    const identity=chosenDeck.id.startsWith("restored-")?undefined:{
      id:chosenDeck.id,
      name:chosenDeck.id==="mono-"+championId?starterDeckLabel(championId):chosenDeck.name
    };
    const newMatch=newSavedMatch(next,rivalSelection,cleanPlayerName(playerName).trim()||DEFAULT_PLAYER_NAME,
      identity,guided?"tutorial":fromArcade?"arcade":"solo");
    writeSavedMatch(newMatch);
    setSavedMatch(newMatch);
    setMatchMeta(newMatch);
    setGame(next);
    setSelectedIndex(null);
    setHandExpanded(false);
    setHoveredHandIndex(null);
    setHoveredBoardCard(null);
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
    setMotion(null);
    clearPreviewTimer();
    clearFinalTimer();
    clearQuieroDecision();
    finishingMatch.current=false;
    setDuelPreview(null);
    setPreDuel(null);
    setFinalStep("ceremony");
    setGame(null);
    setGuidedOpening(false);
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
    setDuelBeat("approach");
    setDuelPreview(duel);
    if(boardRedesign){
      if(guidedRound&&isReducedMotion()){
        setDuelBeat("compare");
        return;
      }
      if(isReducedMotion()){
        duelTimelineTimers.current.push(window.setTimeout(()=>{
          setDuelBeat("result");
          setDuelStep("result");
        },90));
        duelTimelineTimers.current.push(window.setTimeout(finishDuelPresentation,1140));
      }else{
        playDuelCue("rise",audioEnabledRef.current);
        DUEL_BEATS.slice(1).forEach(({at,beat})=>{
          if(guidedRound&&(beat==="impact"||beat==="result"||beat==="settle"))return;
          duelTimelineTimers.current.push(window.setTimeout(()=>{
            setDuelBeat(beat);
            if(beat==="player-power"||beat==="opponent-power"){
              const play=beat==="player-power"?duel.playerPlay:duel.opponentPlay;
              const delta=(play.finalPower??play.card.power)-play.card.power;
              if(delta!==0)playDuelCue(delta>0?"gain":"loss",audioEnabledRef.current);
            }
            if(beat==="impact"&&duel.outcome!=="draw")playDuelCue("impact",audioEnabledRef.current);
            if(beat==="result"){
              setDuelStep("result");
              playDuelCue(duel.outcome==="player"?"victory":duel.outcome==="opponent"?"defeat":"draw",audioEnabledRef.current);
            }
          },at));
        });
        if(!guidedRound)duelTimelineTimers.current.push(window.setTimeout(finishDuelPresentation,DUEL_FINISH_MS));
      }
    }else{
      previewTimer.current=window.setTimeout(showDuelResult,isReducedMotion()?220:2150);
    }
  }

  function useSpecial(kind:"relic"|"symmetry",position?:Position,target?:CopyTarget) {
    if(!game || game.manifestationsEnabled===false || game.phase!=="awaiting_player" || duelPreview)return;
    try{
      const next=cloneGame(game);
      submitPlayerSpecial(next,kind,position,target);
      setGame(next);persistTurn(next);
      setSpecialMode(null);setSpecialError("");
    }catch(error){setSpecialError(error instanceof Error?error.message:"No se pudo usar la especial.");}
  }

  function playCard(handIndex:number, position:Position, originOverride?:ReturnType<typeof handCardRect>) {
    if (!game || game.phase!=="awaiting_player" || duelPreview || boardMotionRef.current) return;
    if (!legalPositions(game.player).includes(position)) return;
    if(boardRedesign && audioEnabled)unlockDuelAudio();
    setPreDuel({
      round:game.round,
      playerLife:game.player.life,
      opponentLife:game.opponent.life,
      playerHealed:game.player.healedLife,
      opponentHealed:game.opponent.healedLife,
      score:{...game.duelScore}
    });
    const origin=boardRedesign?(originOverride??handCardRect(handIndex)):null;
    const next=cloneGame(game);
    submitPlayerPlay(next,handIndex,position,Math.random,Math.min(daggersToUse,availableDaggers));
    rivalQuieroPending.current=boardRedesign && rivalAcceptedQuiero(game,next);
    if(boardRedesign && next.lastDuel){
      setMotion({id:++nextMotionId.current,phase:"flight",before:game,
        duel:next.lastDuel,roundEnded:next.round!==game.round,handIndex,origin});
    }
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
    if(!boardRedesign || !next.lastDuel)showResolvedDuel(next.lastDuel,next.phase==="finished");
  }

  function commitQuiero(wants:boolean) {
    if(!game || game.phase!=="awaiting_quiero" || boardMotionRef.current)return;
    // There is no alternative local resolution. The authoritative engine
    // decides whether the third duel begins or the old round closes.
    const next=cloneGame(game);
    answerQuiero(next,wants);
    if(boardRedesign && next.round!==game.round){
      setMotion({id:++nextMotionId.current,phase:"round",before:game,
        duel:null,roundEnded:true,handIndex:null,origin:null});
    }
    setGame(next);
    persistTurn(next);
    if(next.phase==="finished")startFinalCeremony();
    setSelectedIndex(null);
    setQuieroChoice(null);
    quieroPending.current=false;
  }

  function finishQuieroChoice(wants:boolean) {
    if(!quieroPending.current)return;
    if(quieroChoiceTimer.current!==null)window.clearTimeout(quieroChoiceTimer.current);
    quieroChoiceTimer.current=null;
    commitQuiero(wants);
  }

  function chooseQuiero(wants:boolean) {
    if(!game || game.phase!=="awaiting_quiero" || boardMotionRef.current || quieroPending.current)return;
    if(!boardRedesign || !shouldOfferQuiero(game)){
      commitQuiero(wants);
      return;
    }
    quieroPending.current=true;
    setQuieroChoice(wants);
    quieroChoiceTimer.current=window.setTimeout(()=>finishQuieroChoice(wants),isReducedMotion()?160:420);
  }

  function inspectPlay(played:EnginePlay) {
    setInspection({
      card:played.card,
      finalPower:played.finalPower,
      powerExact:played.powerExact,
      notes:played.notes
    });
  }

  function inspectHandCard(handIndex:number, trigger:HTMLButtonElement) {
    const card=hand[handIndex];
    if(!card)return;
    if(phoneBoard){
      if(!guidedRound)setSelectedIndex(handIndex);
      inspectionTrigger.current=trigger;
    }
    setInspection({card,handIndex,powerExact:true});
  }

  function closeInspection() {
    setInspection(null);
    if(phoneHandInspection){
      inspectionTrigger.current?.focus({preventScroll:true});
      inspectionTrigger.current=null;
    }
  }

  function zoneAt(x:number,y:number):Position|null {
    if (!game || game.phase!=="awaiting_player" || duelPreview || boardMotionRef.current) return null;
    const element=document.elementFromPoint(x,y);
    const zone=element?.closest<HTMLElement>('[data-side="player"][data-position]');
    const position=(zone?.dataset.position as Position|undefined) ?? null;
    return position && legalPositions(game.player).includes(position) ? position : null;
  }

  function handlePointerDown(event:ReactPointerEvent<HTMLButtonElement>, handIndex:number) {
    if (!game || game.phase!=="awaiting_player" || duelPreview || boardMotionRef.current) return;
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
    if(destination&&guidedRound&&selectedIndex!==current.handIndex){
      inspectHandCard(current.handIndex,event.currentTarget);
    }else if (destination) {
      const rect=handCardRect(current.handIndex);
      const releasedRect=rect&&current.moved
        ? {...rect,x:event.clientX-rect.width/2,y:event.clientY-rect.height/2}
        : rect;
      playCard(current.handIndex,destination,releasedRect);
    } else if (!current.moved) {
      inspectHandCard(current.handIndex,event.currentTarget);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setHoveredPosition(null);
  }

  function dismissWelcome() {
    setWelcomeSeen(true);
    setPlayerName(writePlayerName(playerName));
    rememberWelcome();
  }

  function startGuidedOpening() {
    dismissWelcome();
    setBoardRedesign(true);
    startWithChampion(TUTORIAL_MATCH.championId,TUTORIAL_MATCH.opponentId,TUTORIAL_MATCH.difficulty,null,false,true);
  }

  if (!hasEntered) return <SplashScreen onStart={()=>setHasEntered(true)} />;

  if (!game&&!welcomeSeen&&!savedMatch&&!arcadeRun&&history.length===0) {
    return <WelcomeMatch playerName={playerName} onNameChange={setPlayerName}
      onPlay={startGuidedOpening} onSkip={dismissWelcome}/>;
  }

  if (!game) {
    return (
      <>
        {screen==="home" && <HomeScreen
          onPlay={()=>setScreen("decklab")}
          onArcade={()=>setScreen("arcade")}
          onProfile={()=>setScreen("profile")}
          onChampions={()=>setScreen("champions")}
          onContinueArcade={continueArcade}
          arcadeResume={arcadeRun?.status==="active"
            ? `ETAPA ${arcadeRun.index+1}/${arcadeRun.opponents.length} · ${championShortName(champions[arcadeOpponent(arcadeRun)!].name)}`
            : null}
          playerName={playerName}
          onTutorial={()=>setTutorialOpen(true)}
          onGallery={()=>setScreen("collection")}
          onPhysical={()=>setScreen("table")}
          onDeckLab={()=>setScreen("decklab")}
          onMultiplayer={()=>setScreen("multiplayer")}
          onPlaytest={()=>setScreen("playtest")}
          onSettings={()=>setSettingsOpen(true)}
          onContinue={continueMatch}
          saved={arcadeRun?.status==="active"?null:savedMatch}
          analyticsReady={analyticsAvailable()}
          analyticsConsent={analyticsConsent}
          onChangeAnalytics={value=>{setAnalyticsConsent(value);setTelemetryOn(value);}}
        />}
        {screen==="champions" && <ChampionPicker
          mode="browse"
          onBack={()=>setScreen("home")}
          onPlay={()=>setScreen("decklab")}
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
          onPlay={()=>setScreen("decklab")}
        />}
        {screen==="table" && <PhysicalTable onBack={()=>setScreen("home")}/> }
        {screen==="multiplayer" && <Multiplayer onBack={()=>setScreen("home")} playerName={playerName}/>} 
        {screen==="playtest" && <PlaytestHub onBack={()=>setScreen("home")}/>}
        {screen==="profile" && <PlayerProfile playerName={playerName} history={history}
          onNameChange={next=>setPlayerName(writePlayerName(next)||DEFAULT_PLAYER_NAME)}
          onBack={()=>setScreen("home")} onPlay={()=>setScreen("decklab")}/> }
        {screen==="decklab" && <DeckLibrary history={history} onBack={()=>setScreen("home")} onPlay={(deck,rival,difficulty)=>startWithChampion(deck.championId,rival,difficulty,deck)}/> }
        {tutorialOpen && <Tutorial
          inGame={false}
          onClose={()=>setTutorialOpen(false)}
          onPlay={()=>{setTutorialOpen(false);startGuidedOpening();}}
        />}
        {settingsOpen && <SettingsPanel preferences={preferences} onChange={changePreferences} onClose={()=>setSettingsOpen(false)}/>}
      </>
    );
  }

  const legal=game.phase==="awaiting_player" && !duelPreview && !boardMotion ? legalPositions(game.player) : [];
  const showQuieroChoice=boardRedesign && shouldOfferQuiero(game) && !duelPreview && !boardMotion;
  const showRivalQuiero=boardRedesign && boardMotion?.phase==="quiero-ai";
  const completedRound=boardRedesign?completedRoundReceipt(boardMotion,game):null;
  const showingPreviousRound=!!boardMotion && boardMotion.phase!=="archive-reveal" && boardMotion.phase!=="deal" && boardMotion.phase!=="round-wipe-reveal";
  // Display the round that is still physically on the table. The rules engine
  // may already have reset the duel score and drawn the next hand.
  const holdDuelValues=boardMotion?.phase==="flight" ||
    (!!duelPreview && duelBeat!=="settle" && (duelStep==="cards" || !isReducedMotion()));
  const duelPayout=boardRedesign && duelBeat==="settle" ? duelPreview?.outcome : undefined;
  const displayed:DuelPublicSnapshot|null=boardRedesign&&boardMotion&&showingPreviousRound
    ? {
        round:boardMotion.before.round,
        playerLife:holdDuelValues?boardMotion.before.player.life:game.player.life,
        opponentLife:holdDuelValues?boardMotion.before.opponent.life:game.opponent.life,
        playerHealed:holdDuelValues?boardMotion.before.player.healedLife:game.player.healedLife,
        opponentHealed:holdDuelValues?boardMotion.before.opponent.healedLife:game.opponent.healedLife,
        score:holdDuelValues ? boardMotion.before.duelScore : completedRound?.score ?? {
          player:boardMotion.before.duelScore.player+(boardMotion.duel?.outcome==="player"?1:0),
          opponent:boardMotion.before.duelScore.opponent+(boardMotion.duel?.outcome==="opponent"?1:0)
        }
      }
    : duelPreview?preDuel:null;
  const pendingOpponent=duelPreview || boardMotion ? null : game.pendingOpponentPlay;
  // Once the actual Archive flight has finished, no old duel card may
  // reappear as a focus placeholder. Keep the original focus only while that
  // previous round still physically exists on the board.
  const focusPlayer=(boardRedesign&&showingPreviousRound?boardMotion?.duel?.playerPlay:null) ?? duelPreview?.playerPlay ?? null;
  const focusOpponent=(boardRedesign&&showingPreviousRound?boardMotion?.duel?.opponentPlay:null) ?? duelPreview?.opponentPlay ?? pendingOpponent;
  const playerBoard=boardRedesign&&boardMotion&&showingPreviousRound?boardMotion.before.player:game.player;
  const opponentBoard=boardRedesign&&boardMotion&&showingPreviousRound?boardMotion.before.opponent:game.opponent;
  function visibleArchiveCount(side:"player"|"opponent",position:Position) {
    const count=(side==="player"?playerBoard:opponentBoard).archives[position].length;
    if(!game||!boardMotion||(boardMotion.phase!=="archive"&&boardMotion.phase!=="round-wipe"))return count;
    const arrived=archiveArrivals[side+":"+position]??0;
    return count+Math.min(arrived,Math.max(0,archiveCountChange(boardMotion.before,game,side,position)));
  }
  const playerBoardPlays=boardRedesign?visibleRoundPlays(boardMotion,"player"):null;
  const opponentBoardPlays=boardRedesign?visibleRoundPlays(boardMotion,"opponent"):null;
  const latestEvent=game.events.at(-1)?.text ?? "";
  const actingSide=game.phase==="awaiting_player" && !duelPreview ? "player" : null;
  const turnText=duelPreview
    ? `DUELO ${duelPreview.turn} · ${duelStep==="cards"?"PODER":"RESULTADO"}`
    : game.phase==="awaiting_quiero"
      ? "DECISIÓN DE RONDA"
      : game.phase==="finished"
        ? "PARTIDA TERMINADA"
        : `DUELO ${game.turn} · ${game.initiative==="player"?"VOS ABRÍS":"IA ABRE"}`;
  const score=displayed?.score??game.duelScore;
  const deckView=boardRedesign&&boardMotion&&showingPreviousRound?boardMotion.before.player:game.player;
  const openingHint=guidedOpening&&!duelPreview&&boardMotion?.phase!=="round" ? guidedOpeningHint({
    round:game.round,turn:game.turn,phase:game.phase,motion:boardMotion?.phase,
    inspecting:!!inspection,cardSelected:selectedIndex!==null
  }) : null;

  function feedbackFor(answers:MatchFeedbackAnswers) {
    if(!matchMeta||!game)throw new Error("La partida no está disponible.");
    return buildMatchFeedback(matchMeta,game,matchMeta.playerName??playerName,arcadeRun?"arcade":"classic",answers);
  }

  const postgameStage=finalStep==="ceremony"
    ? " is-ceremony"+(boardRedesign?" is-banner-finale":"")
    : finalStep==="feedback"&&matchMeta?" is-feedback":" is-actions";

  return (
    <main data-board-phase={boardRedesign?(boardMotion?.phase??"idle"):"classic"}
      data-duel-payout={duelPayout}
      data-quiero-stage={showQuieroChoice?"choice":showRivalQuiero?"rival":"none"}
      className={"app-shell arena-v2"+(boardRedesign?" board-redesign-v1":"")}>
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
          {phoneBoard && <div className="hybrid-phone-score"
            aria-label={`Duelos de esta ronda: vos ${score.player}, rival ${score.opponent}`}>
            <strong>{score.player}–{score.opponent}</strong><small>VOS · RIVAL</small>
          </div>}
          <div className="hybrid-game-tools">
          {phoneBoard && <button type="button" className="hybrid-phone-menu"
            aria-expanded={phoneToolsOpen} aria-controls="arena-game-tools"
            onClick={()=>setPhoneToolsOpen(open=>!open)}>Menú</button>}
          <div className="game-tools" id="arena-game-tools" hidden={phoneBoard&&!phoneToolsOpen}>
            <button type="button" className="hybrid-board-toggle"
              disabled={!!boardMotion}
              title={boardRedesign?"Mostrar el tablero React anterior":"Ver el nuevo tablero híbrido"}
              onClick={()=>{
                const next=!boardRedesign;
                setBoardRedesign(next);
                setPhoneToolsOpen(false);
                setHoveredHandIndex(null);
                setMotion(null);
                setHandExpanded(false);
                const url=new URL(window.location.href);
                url.searchParams.set("board",next?"hybrid":"classic");
                window.history.replaceState(null,"",url.toString());
              }}>{boardRedesign?"CLÁSICO":"HÍBRIDO"}</button>
            <span className="game-difficulty-label" title="Dificultad de la IA">
              {game.aiDifficulty==="easy"?"FÁCIL":game.aiDifficulty==="hard"?"DIFÍCIL":"NORMAL"}
            </span>
            <ThemeToggle compact/>
            {boardRedesign&&<button type="button" className="duel-sfx-toggle"
              aria-pressed={audioEnabled}
              title={audioEnabled?"Silenciar sonidos de duelo":"Activar sonidos de duelo"}
              onClick={()=>{
                const next=!audioEnabled;
                changePreferences({...preferences,audioEnabled:next});
                audioEnabledRef.current=next;
                if(next)unlockDuelAudio();
              }}>{audioEnabled?"SONIDO ON":"SONIDO OFF"}</button>}
            {(game.player.champion.faction==="ivory"||game.opponent.champion.faction==="ivory") &&
              <div className="arena-augury-control">
                <button className="arena-icon-button" type="button" title="Consultar Augurio"
                  aria-label="Consultar estado de Augurio" aria-expanded={auguryOpen}
                  onClick={()=>setAuguryOpen(!auguryOpen)}><ArenaIcon name="log"/></button>
                {auguryOpen && <div className="arena-augury-popover" role="region" aria-label="Estado de Augurio">
                  <AuguryStatus player={game.player} opponent={game.opponent}/>
                </div>}
              </div>
            }
            <button className="hybrid-board-toggle" type="button" title="Configurar sonido, animaciones y aspecto"
              onClick={()=>{setPhoneToolsOpen(false);setSettingsOpen(true);}}>OPCIONES</button>
            <button className="arena-icon-button" type="button" aria-label="Abrir tutorial"
              title="Ayuda" onClick={()=>{setPhoneToolsOpen(false);setTutorialOpen(true);}}><ArenaIcon name="help"/></button>
            <button className="arena-icon-button" type="button" aria-label="Volver al menú"
              title="Volver al inicio" onClick={()=>{setPhoneToolsOpen(false);clearPreviewTimer();goToMenu("home");}}>
              <ArenaIcon name="exit"/></button>
          </div>
          </div>
        </section>

        <div ref={arenaMainRef} className={"arena-main"+(handExpanded?" hand-expanded":"")}>
          {boardRedesign && <HybridEngraving/>}
          {!phoneBoard && <aside className="arena-sidebar" aria-label="Campeones y marcador">
            {boardRedesign ? <HybridSidebar player={game.player} opponent={game.opponent} playerName={playerName}/> : <>
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
            </>}
          </aside>}
          <div className="arena-stage">
            <span className="arena-visually-hidden" role="status">{turnText}</span>
            {phoneBoard && <HybridPhoneChampion side="opponent" state={game.opponent} userLabel="RIVAL"
              life={displayed?.opponentLife??game.opponent.life}
              healed={displayed?.opponentHealed??game.opponent.healedLife}/>}
            {showQuieroChoice&&<QuieroChoiceStage
              score={game.duelScore} selected={quieroChoice} onChoose={chooseQuiero} onCommitted={finishQuieroChoice}
              bannerImage={championBackgroundUrl(game.player.champion.faction)}/>}
            {showRivalQuiero&&boardMotion&&<RivalQuieroStage
              reducedMotion={isReducedMotion()}
              bannerImage={championBackgroundUrl(game.opponent.champion.faction)}
              onComplete={()=>{
                const current=boardMotionRef.current;
                if(current?.id===boardMotion.id&&current.phase==="quiero-ai")setMotion(null);
              }}/>}

            {hoveredBoardCard && !inspection && !duelPreview && !boardMotion && (
              <div className="arena-card-board-preview" aria-hidden="true">
                <CardFace card={hoveredBoardCard}/>
              </div>
            )}
            {hoveredHandIndex!==null && hand[hoveredHandIndex] && !drag && !inspection && !handExpanded && !duelPreview && !boardMotion && (
              <div className="arena-card-hover-preview" aria-hidden="true">
                <CardFace card={hand[hoveredHandIndex]}/>
              </div>
            )}


        <section className={"battlefield"+(duelPreview?" duel-is-resolving":"")} aria-label="Tablero">
          {boardRedesign&&boardMotion?.phase==="match-entry"&&<MatchEntryMotion
            reducedMotion={isReducedMotion()}
            sequenceId={boardMotion.id}
            onComplete={()=>{
              const current=boardMotionRef.current;
              if(current?.id===boardMotion.id&&current.phase==="match-entry")setMotion({...current,phase:"deal"});
            }}/>}

          {boardRedesign && boardMotion?.phase==="archive-reveal" && <ArchiveReceiptTransition
            sequenceId={boardMotion.id} reducedMotion={isReducedMotion()}
            onComplete={()=>{
              const current=boardMotionRef.current;
              if(current?.id===boardMotion.id&&current.phase==="archive-reveal")
                setMotion({...current,phase:"deal"});
            }}/>}

          {duelPreview && (boardRedesign
            ? <DuelCardsPresentation duel={duelPreview} auguryEvents={duelAuguries}
                beat={duelBeat} outcome={duelStep==="result"?duelPreview.outcome:null}
                before={boardMotion?.before??null} after={game} guideMount={guidedRound?arenaMainRef.current:null}
                onSkipGuide={()=>{setGuidedOpening(false);finishDuelPresentation();}}
                onAdvance={duelStep==="result"?settleDuelPresentation:showDuelResult}/>
            : duelStep==="cards"
              ? <DuelCardsPresentation duel={duelPreview} auguryEvents={duelAuguries}
                  beat="result" onAdvance={showDuelResult}/>
              : <button type="button" className={"duel-cinematic duel-cinematic-"+duelPreview.outcome} onClick={finishDuelPresentation} aria-label="Saltar animación del resultado">
                <span className="duel-cinematic-ring" aria-hidden="true"/>
                <span className="duel-cinematic-ring second" aria-hidden="true"/>
                <span className="duel-cinematic-label">DUELO {duelPreview.turn}</span>
                <strong>{duelPreview.outcome==="player"?"VICTORIA":duelPreview.outcome==="opponent"?"DERROTA":"EMPATE"}</strong>
                <span className="duel-cinematic-powers">{duelPreview.playerPlay.finalPower ?? duelPreview.playerPlay.card.power} <i>—</i> {duelPreview.opponentPlay.finalPower ?? duelPreview.opponentPlay.card.power}</span>
                <span className="duel-cinematic-skip">OMITIR ANIMACIÓN</span>
              </button>
          )}
          {positions.map(position=>(
            <div className="lane" key={position}>
              <Slot
                side="opponent"
                position={position}
                cards={(opponentBoardPlays??game.opponent.roundPlays).filter(play=>play.position===position)}
                pendingCard={pendingOpponent?.position===position ? pendingOpponent : null}
                focusPlay={focusOpponent?.position===position ? focusOpponent : null}
                archive={visibleArchiveCount("opponent",position)}
                archiveUpdated={boardMotion?.phase==="archive-reveal" &&
                  archiveCountChange(boardMotion.before,game,"opponent",position)!==0}
                archiveCards={opponentBoard.archives[position]}
                manifestations={[]}
                onManifestInspect={setSpecialInspection}
                onCopyTarget={game.manifestationsEnabled!==false&&specialMode==="symmetry"
                  ? target=>useSpecial("symmetry",undefined,target) : undefined}
                onCopyArchive={game.manifestationsEnabled!==false&&specialMode==="symmetry"&&game.opponent.archives[position]
                  .some(card=>card.specialArchiveKind==="dagger")
                  ? ()=>useSpecial("symmetry",undefined,{kind:"dagger",position}):undefined}
                active={false}
                capacityValue={capacity(game.opponent,position)}
                onPreview={setHoveredBoardCard}
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
                cards={(playerBoardPlays??game.player.roundPlays).filter(play=>play.position===position)}
                focusPlay={focusPlayer?.position===position ? focusPlayer : null}
                archive={visibleArchiveCount("player",position)}
                archiveUpdated={boardMotion?.phase==="archive-reveal" &&
                  archiveCountChange(boardMotion.before,game,"player",position)!==0}
                archiveCards={playerBoard.archives[position]}
                manifestations={[]}
                onManifestInspect={setSpecialInspection}
                onDropRelic={game.manifestationsEnabled!==false?()=>useSpecial("relic",position):undefined}
                hideFocusDuringFlight={!!boardMotion && boardMotion.phase==="flight"}
                phoneBoard={phoneBoard}
                active={!phoneHandInspection && (specialMode==="relic"
                   ? game.player.roundPlays.every(p=>p.position!==position)
                   : (hoveredPosition===position || (!!selectedCard&&!drag)) && legal.includes(position))}
                capacityValue={capacity(game.player,position)}
                onTap={()=>{
                   if(phoneHandInspection)return;
                   if(specialMode==="relic"){useSpecial("relic",position);return;}
                   if(selectedIndex!==null && legal.includes(position))playCard(selectedIndex,position);
                 }}
                onPreview={setHoveredBoardCard}
                onInspect={inspectPlay}
              />
            </div>
          ))}
        </section>
        {boardRedesign && boardMotion?.phase==="flight" && boardMotion.duel && <CardFlight
          sequenceId={boardMotion.id} origin={boardMotion.origin}
          position={boardMotion.duel.playerPlay.position}
          reducedMotion={isReducedMotion()}
          onLand={()=>playDuelCue("land",audioEnabled)}
          onComplete={()=>{
            const active=boardMotionRef.current;
            if(!active || active.id!==boardMotion.id || active.phase!=="flight")return;
            setMotion({...active,phase:"duel"});
            showResolvedDuel(active.duel,game.phase==="finished");
          }}>
          <CardFace card={boardMotion.duel.playerPlay.card}/>
        </CardFlight>}
        {boardRedesign && boardMotion?.phase==="archive" && <ArchiveFlight
          sequenceId={boardMotion.id} reducedMotion={isReducedMotion()}
          onArrival={(side,position)=>{
            const current=boardMotionRef.current;
            if(current?.id!==boardMotion.id||current.phase!=="archive")return;
            const key=side+":"+position;
            flushSync(()=>setArchiveArrivals(previous=>({...previous,[key]:(previous[key]??0)+1})));
          }}
          onComplete={()=>{
            const current=boardMotionRef.current;
            if(current?.id===boardMotion.id&&current.phase==="archive"){
              // After actual cards enter their Archives, the curtain covers the
              // old board. Only at full cover do we swap to the already
              // committed new-round GameState and genuine hand.
              setMotion({...current,phase:game.phase==="finished"?"archive-reveal":"round-wipe"});
            }
          }}/>}
        {boardRedesign && boardMotion?.phase==="deal" && <DealMotion
          sequenceId={boardMotion.id} reducedMotion={isReducedMotion()}
          onLand={()=>playDuelCue("land",audioEnabledRef.current)}
          onComplete={()=>{
            if(boardMotionRef.current?.id===boardMotion.id)setMotion(null);
          }}/>}
        {phoneBoard && <HybridPhoneChampion side="player" state={game.player}
          userLabel={playerName.trim()&&playerName!=="JUGADOR"?playerName.trim():DEFAULT_PLAYER_NAME}
          life={displayed?.playerLife??game.player.life}
          healed={displayed?.playerHealed??game.player.healedLife}/>}
        {boardRedesign&&!phoneBoard && <HybridRightRail
          playerLife={displayed?.playerLife??game.player.life}
          opponentLife={displayed?.opponentLife??game.opponent.life}
          playerHealed={displayed?.playerHealed??game.player.healedLife}
          opponentHealed={displayed?.opponentHealed??game.opponent.healedLife}
          score={score}
          deckFaction={deckView.champion.faction}
          deckRemaining={deckView.deck.length}
          discardCount={deckView.discard.length}
        />}

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
          {openingHint&&<OpeningGuide message={openingHint} onSkip={()=>setGuidedOpening(false)}/>}
          <button type="button" className="arena-hand-toggle" aria-expanded={handExpanded}
            aria-label={handExpanded?"Contraer mano":"Desplegar mano"}
            onClick={()=>{setHandExpanded(!handExpanded);setHoveredHandIndex(null);}}>
            <span className="arena-hand-toggle-handle" aria-hidden="true"/>
            <span>{handExpanded?"CERRAR MANO":"ABRIR MANO"}</span>
            <span className="arena-hand-toggle-chevron" aria-hidden="true">{handExpanded?"⌄":"⌃"}</span>
          </button>

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
                data-motion-hand-index={index}
                aria-pressed={phoneBoard ? selectedIndex===index : undefined}
                disabled={game.phase!=="awaiting_player" || !!duelPreview || !!boardMotion}
                onPointerEnter={()=>setHoveredHandIndex(index)}

                onPointerLeave={()=>setHoveredHandIndex(current=>current===index?null:current)}

                onFocus={()=>setHoveredHandIndex(index)}

                onBlur={()=>setHoveredHandIndex(current=>current===index?null:current)}

                onClick={event=>{
                  if(event.detail===0)inspectHandCard(index,event.currentTarget);
                }}

                onPointerDown={event=>{

                  if(!boardRedesign && !handExpanded && window.matchMedia("(min-width:761px)").matches){
                     setHandExpanded(true);
                     setHoveredHandIndex(null);
                     return;
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
          {game.manifestationsEnabled!==false && !!specialHand.length && <aside className="manifest-hand" aria-label="Mano de cartas especiales">
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
        {boardRedesign && <HybridCommandRail
          game={game}
          pendingOpponent={pendingOpponent}
          selectedCard={selectedCard}
          latestEvent={latestEvent}
          duelResolving={!!duelPreview||!!boardMotion}
          decisionOnField={showQuieroChoice}
          phoneDeck={phoneBoard?{remaining:deckView.deck.length,discarded:deckView.discard.length}:undefined}
          displayRound={displayed?.round??game.round}
          displayTurn={showingPreviousRound?(duelPreview?.turn??boardMotion?.duel?.turn??boardMotion?.before.turn??game.turn):game.turn}
          transitionLabel={boardMotion?.phase==="match-entry"?"Preparando la mesa…":boardMotion?.phase==="flight"?"Jugando carta…":boardMotion?.phase==="quiero-ai"?"El rival eligió Quiero · tercer duelo…":boardMotion?.phase==="round"?"Ronda finalizada…":boardMotion?.phase==="archive"?"Archivando cartas…":boardMotion?.phase==="round-wipe"||boardMotion?.phase==="round-wipe-reveal"?"Nueva ronda…":boardMotion?.phase==="archive-reveal"?"Archivos actualizados…":boardMotion?.phase==="deal"?"Repartiendo nueva mano…":undefined}
          onChooseQuiero={chooseQuiero}
        />}

          </div>
        {boardRedesign && boardMotion?.phase==="round" && <RoundTransition
          sequenceId={boardMotion.id} reducedMotion={isReducedMotion()}
          summary={completedRound}
          held={guidedRound}
          bannerImage={championBackgroundUrl(game.player.champion.faction)}
          onComplete={()=>{
            const current=boardMotionRef.current;
            if(current?.id===boardMotion.id&&current.phase==="round")
              setMotion({...current,phase:"archive"});
          }}/>}

          {/* The stationary backdrop conceals the board swap behind the centered banner. */}
                  {boardRedesign && (boardMotion?.phase==="round-wipe"||boardMotion?.phase==="round-wipe-reveal") && <NewRoundStinger
                    sequenceId={boardMotion.id} round={game.round} reducedMotion={isReducedMotion()}
                    bannerImage={championBackgroundUrl(game.player.champion.faction)}
                    covered={boardMotion.phase==="round-wipe-reveal"}
                    onCovered={()=>{
                      const current=boardMotionRef.current;
                      if(current?.id===boardMotion.id&&current.phase==="round-wipe")
                        setMotion({...current,phase:"round-wipe-reveal"});
                    }}
                    onComplete={()=>{
                      const current=boardMotionRef.current;
                      if(current?.id===boardMotion.id&&current.phase==="round-wipe-reveal")
                        setMotion({...current,phase:"deal"});
                    }}/>}
          
        </div>

        {game.manifestationsEnabled!==false && specialInspection && <ManifestCardDialog kind={specialInspection} onClose={()=>setSpecialInspection(null)}/>}

        {inspection && (
          <div
            className={"card-zoom-overlay"+(phoneHandInspection?" is-phone-hand-inspection":"")+(guidedHandInspection?" is-guided-hand-inspection":"")}
            role="dialog"
            aria-modal="true"
            aria-label={inspection.card.name}
            aria-describedby={phoneHandInspection?"phone-hand-inspection-details":undefined}
            onClick={closeInspection}
            onKeyDown={phoneHandInspection ? event=>{
              if(event.key==="Tab"){
                event.preventDefault();
                if(guidedHandInspection){
                  const target=(event.target as Element).matches(".zoom-close")?".dl-guide-inspection-next":".zoom-close";
                  event.currentTarget.querySelector<HTMLElement>(target)?.focus();
                }
              }
              if(event.key==="Escape"){
                event.preventDefault();
                closeInspection();
              }
            } : undefined}
          >
            <div className="card-zoom-panel" onClick={event=>event.stopPropagation()}>
              <button
                className="zoom-close"
                type="button"
                aria-label="Cerrar carta"
                autoFocus={phoneHandInspection}
                onClick={closeInspection}
              >×</button>
              <div className="zoom-card-frame">
                <CardFace
                  card={inspection.card}
                  finalPower={inspection.finalPower}
                  powerExact={inspection.powerExact!==false}
                  livePower={inspection.finalPower!==undefined || inspection.powerExact===false}
                />
              </div>
              {game.manifestationsEnabled!==false && inspection.card.trait && <p className="manifest-inspect-rule">
                 <strong>{inspection.card.trait.toUpperCase()}</strong> · {SPECIAL_TEXT[
                   inspection.card.trait.startsWith("Portaanillos")?
                     inspection.card.trait.includes("Sinistral")?"shield":"dagger":
                     inspection.card.trait==="Objeto mágico"?"relic":"symmetry"
                 ]}
               </p>}
              {phoneHandInspection
                ? <>
                  <p id="phone-hand-inspection-details" className="arena-visually-hidden">
                    Poder {inspection.card.power}. {inspection.card.text}
                  </p>
                  {guidedHandInspection&&<button type="button" className="primary-button dl-guide-inspection-next" onClick={()=>{
                    setSelectedIndex(inspection.handIndex!);
                    closeInspection();
                  }}>CONTINUAR →</button>}
                </>
                : <div className="zoom-actions">
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
                  {phoneBoard && <p className="hybrid-phone-card-rule">{inspection.card.text}</p>}
                </div>
                {game.phase==="awaiting_player" && inspection.handIndex!==undefined && !duelPreview && !boardMotion && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={()=>{
                      setSelectedIndex(inspection.handIndex!);
                      setInspection(null);
                    }}
                  >{guidedHandInspection?"CONTINUAR →":"SELECCIONAR"}</button>
                )}
              </div>}
            </div>
          </div>
        )}

        {game.phase==="awaiting_quiero" && !duelPreview && !boardRedesign && (
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

        {game.phase==="finished" && !duelPreview && !boardMotion && !finishingMatch.current && (
          <div className={"decision-overlay match-conclusion-stage"+postgameStage}>
            {finalStep==="ceremony" ? (boardRedesign ? (
              <MatchFinaleBanner game={game}
                kicker={arcadeRun?.status==="complete"?"ARCADE COMPLETADO":arcadeRun
                  ? "ARCADE · "+(arcadeRun.index+1)+"/"+arcadeRun.opponents.length : "FIN DE PARTIDA"}
                title={arcadeRun?.status==="complete"?"TODOS DERROTADOS":
                  game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE"}
                onContinue={()=>{clearFinalTimer();setFinalStep("feedback");}}/>
            ) : (
              <div className={"match-conclusion-ceremony match-final-"+game.winner} role="status" aria-live="polite">
                <span className="match-conclusion-symbol" aria-hidden="true">{game.winner==="player"?"✦":game.winner==="opponent"?"◇":"◈"}</span>
                <span className="match-conclusion-kicker">{arcadeRun
                  ? arcadeRun.status==="complete"?"ARCADE COMPLETADO"
                    : `ARCADE · ${arcadeRun.index+1}/${arcadeRun.opponents.length}`
                  : "FIN DE PARTIDA"}</span>
                <strong>{arcadeRun?.status==="complete"?"TODOS DERROTADOS":game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE"}</strong>
                <span className="match-conclusion-score">{game.player.life} — {game.opponent.life} VIDA</span>
                <button type="button" className="match-conclusion-continue" onClick={()=>{clearFinalTimer();setFinalStep("feedback");}}>CONTINUAR →</button>
              </div>
            )) : finalStep==="feedback"&&matchMeta ? (
              <MatchFeedback
                key={matchMeta.id}
                playerName={matchMeta.playerName??playerName}
                available={feedbackAvailable()}
                onSkip={()=>setFinalStep("actions")}
                onSubmit={answers=>submitMatchFeedback(feedbackFor(answers))}
                onDownload={answers=>downloadPlaytest("daggerlight-feedback.json",JSON.stringify(feedbackFor(answers),null,2))}
              />
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
                    <button className="secondary-button" type="button" onClick={()=>goToMenu("decklab")}>CAMBIAR MAZO</button>
                    <button className="primary-button" type="button" onClick={beginMatch}>REVANCHA</button>
                  </div>
                </>}
              </div>
            )}
          </div>
        )}

      </div>

      {tutorialOpen && <Tutorial inGame onClose={()=>setTutorialOpen(false)} onPlay={()=>setTutorialOpen(false)} />}
      {settingsOpen && <SettingsPanel preferences={preferences} onChange={changePreferences} onClose={()=>setSettingsOpen(false)}/>}
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
