import { useEffect, useMemo, useRef, useState } from "react";
import Tutorial from "./Tutorial";
import ThemeToggle from "./ThemeToggle";
import AuguryStatus from "./AuguryStatus";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import { HomeScreen, ChampionPicker, CardCollection } from "./FrontOffice";
import PhysicalTable from "./PhysicalTable";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { positionLabels, positions } from "./data";
import { studioThemes } from "./cardStudio";
import { champions } from "./engine/champions";
import { answerQuiero, cloneGame, startGame, submitPlayerPlay } from "./engine/game";
import { capacity, legalPositions } from "./engine/rules";
import type { AIDifficulty, DuelSummary, EnginePlay, GameState } from "./engine/types";
import { formatPowerDelta, playEffectFeedback, playPowerDelta } from "./engine/presentation";
import type { CardDefinition, Position } from "./types";

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
        {effect==="inactive"&&<span className="duel-showcase-failed">HABILIDAD NO ACTIVADA</span>}
        {effect==="activated"&&<span className="duel-showcase-activated">HABILIDAD ACTIVADA</span>}
        {effect==="forecast"&&<span className="duel-showcase-activated">AUGURIO ANUNCIADO</span>}
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

function ChampionBar({
  side,
  name,
  life,
  passive
}: {
  side: "player" | "opponent";
  name: string;
  life: number;
  passive: string;
}) {
  return (
    <section className={`champion-bar ${side}`}>
      <div className="champion-medallion">{side === "player" ? "M" : "A"}</div>
      <div className="champion-copy">
        <span className="champion-eyebrow">{side === "player" ? "VOS" : "RIVAL"}</span>
        <strong>{name}</strong>
        <span className="champion-passive">{passive}</span>
      </div>
      <div className="life-block" aria-label={`${life} de 9 de Vida`}>
        <b>{life}</b><span>♥</span>
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
  onTap,
  onInspect
}: {
  side: "player" | "opponent";
  position: Position;
  cards: EnginePlay[];
  pendingCard?: EnginePlay | null;
  focusPlay?: EnginePlay | null;
  archive: number;
  active: boolean;
  capacityValue: number;
  onTap?: () => void;
  onInspect: (played:EnginePlay)=>void;
}) {
  const focusAlreadyInCards = !!focusPlay && cards.some(played=>samePlay(played,focusPlay));
  return (
    <div
      className={`board-slot ${side} ${active ? "drop-active" : ""}`}
      data-position={position}
      data-side={side}
      onClick={side === "player" ? onTap : undefined}
    >
      <span className="archive-count" title="Archivo">{archive}</span>
      <span className="slot-capacity" title="Capacidad">{cards.length}/{capacityValue}</span>
      <div className="slot-stack">
        {cards.length === 0 && !pendingCard && !focusPlay ? (
          <div className="slot-empty" />
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default function App() {
  const championIds=Object.keys(champions);
  const [playerChampion,setPlayerChampion]=useState("dextral");
  const [opponentChampion,setOpponentChampion]=useState("random");
  const [aiDifficulty,setAiDifficulty]=useState<AIDifficulty>("normal");
  const [screen,setScreen]=useState<"home"|"champions"|"collection"|"table">("home");
  const [game,setGame]=useState<GameState|null>(null);
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
    clearFinalTimer();
    setFinalStep("ceremony");
    finalTimer.current=window.setTimeout(()=>{
      setFinalStep("actions");
      finalTimer.current=null;
    },isReducedMotion()?600:1900);
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

  function startWithChampion(championId:string, rivalSelection:string, difficulty:AIDifficulty=aiDifficulty) {
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    const opponent = rivalSelection==="random"
      ? championIds.filter(id=>id!==championId)[Math.floor(Math.random()*(championIds.length-1))]
      : rivalSelection;
    setPlayerChampion(championId);
    setOpponentChampion(rivalSelection);
    setAiDifficulty(difficulty);
    setGame(startGame(championId,opponent,Math.random,undefined,difficulty));
    setSelectedIndex(null);
    setInspection(null);
    setDuelPreview(null);
    setPreDuel(null);
    setDuelStep("cards");
    setFinalStep("ceremony");
    setDuelAuguries([]);
    setDrag(null);
    setHoveredPosition(null);
  }

  function beginMatch() {
    startWithChampion(playerChampion,opponentChampion,aiDifficulty);
  }

  function goToMenu(destination:"home"|"champions"|"collection"|"table") {
    clearPreviewTimer();
    clearFinalTimer();
    finishingMatch.current=false;
    setDuelPreview(null);
    setPreDuel(null);
    setFinalStep("ceremony");
    setGame(null);
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

  function playCard(handIndex:number, position:Position) {
    if (!game || game.phase!=="awaiting_player" || duelPreview) return;
    if (!legalPositions(game.player).includes(position)) return;
    setPreDuel({
      round:game.round,
      playerLife:game.player.life,
      opponentLife:game.opponent.life,
      score:{...game.duelScore}
    });
    const next=cloneGame(game);
    submitPlayerPlay(next,handIndex,position);
    const newAuguries=next.events.slice(game.events.length).filter(event=>event.text.startsWith("Augurio ·"));
    const healingEvents=next.events.slice(game.events.length).filter(event=>event.text.includes("recupera 1 Vida"));
    setDuelAuguries([...newAuguries,...healingEvents].map(event=>event.text.replace(/^Augurio · /,"").replace(" · próxima carta "," · ")).slice(0,3));
    setGame(next);
    setSelectedIndex(null);
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

  if (!game) {
    return (
      <>
        {screen==="home" && <HomeScreen
          onPlay={()=>setScreen("champions")}
          onTutorial={()=>setTutorialOpen(true)}
          onGallery={()=>setScreen("collection")}
          onPhysical={()=>setScreen("table")}
        />}
        {screen==="champions" && <ChampionPicker
          onBack={()=>setScreen("home")}
          onPlay={startWithChampion}
          onGallery={()=>setScreen("collection")}
        />}
        {screen==="collection" && <CardCollection
          onBack={()=>setScreen("home")}
          onPlay={()=>setScreen("champions")}
        />}
        {screen==="table" && <PhysicalTable onBack={()=>setScreen("home")}/> }
        {tutorialOpen && <Tutorial
          inGame={false}
          onClose={()=>setTutorialOpen(false)}
          onPlay={()=>{setTutorialOpen(false);setScreen("champions");}}
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
  const turnText=duelPreview
    ? `DUELO ${duelPreview.turn} · ${duelStep==="cards"?"PODER":"RESULTADO"}`
    : game.phase==="awaiting_quiero"
      ? "DECISIÓN DE RONDA"
      : game.phase==="finished"
        ? "PARTIDA TERMINADA"
        : `DUELO ${game.turn} · ${game.initiative==="player"?"VOS ABRÍS":"IA ABRE"}`;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="game-frame">
        <ChampionBar
          side="opponent"
          name={game.opponent.champion.name}
          life={displayed?.opponentLife??game.opponent.life}
          passive={game.opponent.champion.text}
        />

        <section className="match-strip has-guide">
          <div>
            <span>RONDA</span>
            <b>{displayed?.round??game.round}</b>
          </div>
          <div className="duel-status">
            <strong>{displayed?.score.player??game.duelScore.player} — {displayed?.score.opponent??game.duelScore.opponent}</strong>
            <span>{turnText}</span>
          </div>
          <div className="game-tools">
            <span className="game-difficulty-label" title="Dificultad de la IA">IA: {game.aiDifficulty==="easy"?"Fácil":game.aiDifficulty==="hard"?"Difícil":"Normal"}</span>
            <ThemeToggle compact />
            <button className="academy-utility" type="button" onClick={()=>setTutorialOpen(true)} aria-label="Abrir tutorial">? AYUDA</button>
          </div>
          <button
            className="utility-button"
            type="button"
            aria-label="Nueva partida"
            onClick={()=>{
              clearPreviewTimer();
              goToMenu("home");
            }}
          >×</button>
        </section>

        <div className="game-hint">
          <span className="game-hint-instruction">{game.phase==="awaiting_player" && !duelPreview ? (game.initiative==="player" ? <><b>Tu turno:</b> elegí una carta y tocá una posición libre.</> : <><b>Tu respuesta:</b> mirá la carta rival y elegí cómo enfrentarla.</>) : <><b>Compará Poderes:</b> cada duelo ganado quita 1 Vida rival.</>}</span>
          {!duelPreview && <AuguryStatus player={game.player} opponent={game.opponent} />}
        </div>
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
                active={false}
                capacityValue={capacity(game.opponent,position)}
                onInspect={inspectPlay}
              />

              <div className="lane-axis">
                <span>{positionLabels[position]}</span>
                <i />
              </div>

              <Slot
                side="player"
                position={position}
                cards={game.player.roundPlays.filter(play=>play.position===position)}
                focusPlay={focusPlayer?.position===position ? focusPlayer : null}
                archive={game.player.archives[position].length}
                active={(hoveredPosition===position || (!!selectedCard&&!drag)) && legal.includes(position)}
                capacityValue={capacity(game.player,position)}
                onTap={()=>selectedIndex!==null && legal.includes(position) && playCard(selectedIndex,position)}
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

        <ChampionBar
          side="player"
          name={game.player.champion.name}
          life={displayed?.playerLife??game.player.life}
          passive={game.player.champion.text}
        />

        <section className="hand-zone" aria-label="Tu mano">
          <div className="hand-label">
            <span>TU MANO</span>
            <small>{hand.length} cartas</small>
          </div>
          <div className="hand">
            {hand.map((card,index)=>(
              <button
                className={`hand-card ${selectedIndex===index?"is-selected":""}`}
                type="button"
                key={`${card.id}-${index}`}
                disabled={game.phase!=="awaiting_player" || !!duelPreview}
                onPointerDown={event=>handlePointerDown(event,index)}
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
        </section>

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
                <span className="match-conclusion-kicker">FIN DE PARTIDA</span>
                <strong>{game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE"}</strong>
                <span className="match-conclusion-score">{game.player.life} — {game.opponent.life} VIDA</span>
                <button type="button" className="match-conclusion-continue" onClick={()=>{clearFinalTimer();setFinalStep("actions");}}>CONTINUAR →</button>
              </div>
            ) : (
              <div className="decision-card match-postgame" role="group" aria-label="Opciones después de la partida">
                <span>PARTIDA FINALIZADA</span>
                <strong>{game.winner==="player"?"GANASTE":game.winner==="opponent"?"GANÓ LA IA":"EMPATE"}</strong>
                <p>{game.player.life}–{game.opponent.life} de Vida · {game.round} ronda{game.round===1?"":"s"}.</p>
                <div className="match-postgame-actions">
                  <button className="secondary-button" type="button" onClick={()=>goToMenu("champions")}>CAMBIAR CHAMPION</button>
                  <button className="primary-button" type="button" onClick={beginMatch}>REVANCHA</button>
                </div>
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
