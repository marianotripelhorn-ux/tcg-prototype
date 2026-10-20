import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { positionLabels, positions } from "./data";
import { studioThemes } from "./cardStudio";
import { champions } from "./engine/champions";
import { answerQuiero, cloneGame, startGame, submitPlayerPlay } from "./engine/game";
import { capacity, legalPositions } from "./engine/rules";
import type { EnginePlay, GameState } from "./engine/types";
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

function CardFace({
  card,
  finalPower,
  compact = false,
  selected = false,
  ghost = false,
  pending = false
}: {
  card: CardDefinition;
  finalPower?: number;
  compact?: boolean;
  selected?: boolean;
  ghost?: boolean;
  pending?: boolean;
}) {
  const theme = studioThemes[card.faction];
  const artStyle: CSSProperties | undefined = card.art
    ? {
        backgroundImage: `url("${card.art.sprite}")`,
        backgroundSize: "300% 200%",
        backgroundPosition: `${card.art.column * 50}% ${card.art.row * 100}%`
      }
    : undefined;
  const themeStyle = {
    "--card-crown": theme.crown,
    "--card-divider": theme.divider,
    "--card-rules": theme.rules,
    "--card-title": theme.title,
    "--card-power": theme.power
  } as CSSProperties;

  if (card.faction === "red" && card.art) {
    return (
      <article
        className={[
          "game-card",
          "red",
          "studio-card",
          compact ? "compact" : "",
          selected ? "selected" : "",
          ghost ? "ghost" : "",
          pending ? "pending-card" : ""
        ].filter(Boolean).join(" ")}
        style={themeStyle}
        aria-label={card.name}
      >
        <div className="studio-card-sprite" style={artStyle} />
        {compact && finalPower !== undefined && (
          <span className="board-final-power">{finalPower}</span>
        )}
      </article>
    );
  }

  return (
    <article
      className={[
        "game-card",
        card.faction,
        compact ? "compact" : "",
        selected ? "selected" : "",
        ghost ? "ghost" : "",
        pending ? "pending-card" : ""
      ].filter(Boolean).join(" ")}
      style={themeStyle}
      aria-label={card.name}
    >
      <div className={`card-art ${card.art ? "" : "no-art"}`} style={artStyle} />
      <div className="card-shade" />
      <div className="card-power">{finalPower ?? card.power}</div>
      <div className="card-symbols">
        <FactionMark card={card} />
        <TraitMark trait={card.trait} />
      </div>
      <div className="card-copy">
        <strong>{card.name}</strong>
        {!compact && <p>{card.text}</p>}
      </div>
      {!compact && <span className="card-footer"><i>{card.studioId}</i><i>MT 2026</i></span>}
    </article>
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

function Slot({
  side,
  position,
  cards,
  pendingCard,
  archive,
  active,
  capacityValue,
  onTap
}: {
  side: "player" | "opponent";
  position: Position;
  cards: EnginePlay[];
  pendingCard?: EnginePlay | null;
  archive: number;
  active: boolean;
  capacityValue: number;
  onTap?: () => void;
}) {
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
        {cards.length === 0 && !pendingCard ? (
          <div className="slot-empty" />
        ) : (
          <>
            {cards.map((played, index) => (
              <div className="played-card" key={played.card.id + index}>
                <CardFace card={played.card} finalPower={played.finalPower} compact />
              </div>
            ))}
            {pendingCard && (
              <div className="played-card pending-play">
                <CardFace card={pendingCard.card} compact pending />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Setup({
  playerChampion,
  opponentChampion,
  onPlayerChange,
  onOpponentChange,
  onStart
}: {
  playerChampion: string;
  opponentChampion: string;
  onPlayerChange: (value:string)=>void;
  onOpponentChange: (value:string)=>void;
  onStart: ()=>void;
}) {
  const ids=Object.keys(champions);
  return (
    <main className="setup-shell">
      <section className="setup-card">
        <div className="setup-kicker">DAGGERLIGHT · ONLINE CLIENT</div>
        <h1>Partida de prueba</h1>
        <p>UI v2 usa el motor real, la IA v0.8.7 y el pool actual de 48 cartas.</p>

        <label>
          <span>Tu Champion</span>
          <select value={playerChampion} onChange={event=>onPlayerChange(event.target.value)}>
            {ids.map(id=><option value={id} key={id}>{champions[id].name}</option>)}
          </select>
        </label>

        <label>
          <span>Rival</span>
          <select value={opponentChampion} onChange={event=>onOpponentChange(event.target.value)}>
            <option value="random">Aleatorio</option>
            {ids.map(id=><option value={id} key={id}>{champions[id].name}</option>)}
          </select>
        </label>

        <button className="primary-button" type="button" onClick={onStart}>JUGAR</button>
        <small>Azul, Empíreos y Santos usan cartas temporales sin arte.</small>
      </section>
    </main>
  );
}

export default function App() {
  const championIds=Object.keys(champions);
  const [playerChampion,setPlayerChampion]=useState("dextral");
  const [opponentChampion,setOpponentChampion]=useState("random");
  const [game,setGame]=useState<GameState|null>(null);
  const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
  const [drag,setDrag]=useState<DragState|null>(null);
  const [hoveredPosition,setHoveredPosition]=useState<Position|null>(null);

  const hand=game?.player.hand ?? [];
  const selectedCard=useMemo(
    ()=>selectedIndex===null ? null : hand[selectedIndex] ?? null,
    [hand,selectedIndex]
  );

  function beginMatch() {
    const opponent = opponentChampion==="random"
      ? championIds.filter(id=>id!==playerChampion)[Math.floor(Math.random()*(championIds.length-1))]
      : opponentChampion;
    setGame(startGame(playerChampion,opponent));
    setSelectedIndex(null);
    setDrag(null);
    setHoveredPosition(null);
  }

  function playCard(handIndex:number, position:Position) {
    if (!game || game.phase!=="awaiting_player") return;
    if (!legalPositions(game.player).includes(position)) return;
    const next=cloneGame(game);
    submitPlayerPlay(next,handIndex,position);
    setGame(next);
    setSelectedIndex(null);
    setHoveredPosition(null);
    setDrag(null);
  }

  function chooseQuiero(wants:boolean) {
    if (!game) return;
    const next=cloneGame(game);
    answerQuiero(next,wants);
    setGame(next);
    setSelectedIndex(null);
  }

  function zoneAt(x:number,y:number):Position|null {
    if (!game || game.phase!=="awaiting_player") return null;
    const element=document.elementFromPoint(x,y);
    const zone=element?.closest<HTMLElement>('[data-side="player"][data-position]');
    const position=(zone?.dataset.position as Position|undefined) ?? null;
    return position && legalPositions(game.player).includes(position) ? position : null;
  }

  function handlePointerDown(event:ReactPointerEvent<HTMLButtonElement>, handIndex:number) {
    if (!game || game.phase!=="awaiting_player") return;
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
      setSelectedIndex(value=>value===current.handIndex ? null : current.handIndex);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setHoveredPosition(null);
  }

  if (!game) {
    return (
      <Setup
        playerChampion={playerChampion}
        opponentChampion={opponentChampion}
        onPlayerChange={setPlayerChampion}
        onOpponentChange={setOpponentChampion}
        onStart={beginMatch}
      />
    );
  }

  const legal=game.phase==="awaiting_player" ? legalPositions(game.player) : [];
  const pendingOpponent=game.pendingOpponentPlay;
  const latestEvent=game.events.at(-1)?.text ?? "";
  const turnText=game.phase==="awaiting_quiero"
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
          life={game.opponent.life}
          passive={game.opponent.champion.text}
        />

        <section className="match-strip">
          <div>
            <span>RONDA</span>
            <b>{game.round}</b>
          </div>
          <div className="duel-status">
            <strong>{game.duelScore.player} — {game.duelScore.opponent}</strong>
            <span>{turnText}</span>
          </div>
          <button
            className="utility-button"
            type="button"
            aria-label="Nueva partida"
            onClick={()=>setGame(null)}
          >×</button>
        </section>

        <section className="battlefield" aria-label="Tablero">
          {positions.map(position=>(
            <div className="lane" key={position}>
              <Slot
                side="opponent"
                position={position}
                cards={game.opponent.roundPlays.filter(play=>play.position===position)}
                pendingCard={pendingOpponent?.position===position ? pendingOpponent : null}
                archive={game.opponent.archives[position].length}
                active={false}
                capacityValue={capacity(game.opponent,position)}
              />

              <div className="lane-axis">
                <span>{positionLabels[position]}</span>
                <i />
              </div>

              <Slot
                side="player"
                position={position}
                cards={game.player.roundPlays.filter(play=>play.position===position)}
                archive={game.player.archives[position].length}
                active={(hoveredPosition===position || (!!selectedCard&&!drag)) && legal.includes(position)}
                capacityValue={capacity(game.player,position)}
                onTap={()=>selectedIndex!==null && legal.includes(position) && playCard(selectedIndex,position)}
              />
            </div>
          ))}
        </section>

        <div className="action-line" role="status">
          {game.lastDuel
            ? `${latestEvent}`
            : pendingOpponent
              ? `IA jugó ${pendingOpponent.card.name} en ${positionLabels[pendingOpponent.position]}. Respondé.`
              : latestEvent}
        </div>

        <ChampionBar
          side="player"
          name={game.player.champion.name}
          life={game.player.life}
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
                disabled={game.phase!=="awaiting_player"}
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

        {game.phase==="awaiting_quiero" && (
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

        {game.phase==="finished" && (
          <div className="decision-overlay">
            <div className="decision-card result-card">
              <span>RESULTADO</span>
              <strong>{game.winner==="player"?"GANASTE":game.winner==="opponent"?"GANÓ LA IA":"EMPATE"}</strong>
              <p>{game.player.life}–{game.opponent.life} de Vida · {game.round} ronda{game.round===1?"":"s"}.</p>
              <div>
                <button className="secondary-button" onClick={()=>setGame(null)}>CAMBIAR CHAMPIONS</button>
                <button className="primary-button" onClick={beginMatch}>REVANCHA</button>
              </div>
            </div>
          </div>
        )}
      </div>

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
