import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { byId, positionLabels, positions } from "./data";
import { studioThemes } from "./cardStudio";
import { createGame } from "./engine/state";
import { capacity, legalPositions } from "./engine/rules";
import type { EnginePlay, GameState } from "./engine/types";
import type { CardDefinition, PlayedCard, Position } from "./types";

type DragState = {
  cardId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};

function makePreviewGame(): GameState {
  const game = createGame("dextral", "athos");
  game.player.life = 8;
  game.opponent.life = 6;
  game.player.hand = [
    byId("incendiario"),
    byId("maestro_armas"),
    byId("guardia_castillo")
  ];
  game.player.archives.siniestra = [byId("mensajero"), byId("asesor_real")];
  game.player.archives.trono = [byId("corona_eterea")];
  game.player.archives.diestra = [byId("invocadagas"), byId("guardia_dextral"), byId("caballero_tigre")];

  game.opponent.archives.siniestra = [byId("mensajero")];
  game.opponent.archives.trono = [byId("corona_eterea"), byId("asesor_real")];
  game.opponent.archives.diestra = [byId("invocadagas"), byId("guardia_dextral")];
  game.opponent.roundPlays = [
    { card: byId("guardia_dextral"), position: "siniestra", finalPower: 7 },
    { card: byId("abanderado_real"), position: "diestra", finalPower: 6 }
  ];
  game.duelScore = { player: 1, opponent: 0 };
  game.turn = 2;
  return game;
}

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
  ghost = false
}: {
  card: CardDefinition;
  finalPower?: number;
  compact?: boolean;
  selected?: boolean;
  ghost?: boolean;
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

  return (
    <article
      className={[
        "game-card",
        card.faction,
        compact ? "compact" : "",
        selected ? "selected" : "",
        ghost ? "ghost" : ""
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
  archive,
  active,
  capacityValue,
  onTap
}: {
  side: "player" | "opponent";
  position: Position;
  cards: PlayedCard[];
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
        {cards.length === 0 ? (
          <div className="slot-empty" />
        ) : cards.map((played, index) => (
          <div className="played-card" key={played.card.id + index}>
            <CardFace card={played.card} finalPower={played.finalPower} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(makePreviewGame);
  const hand = game.player.hand;
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [lastAction, setLastAction] = useState("Arrastrá una carta a una posición.");

  const selectedCard = useMemo(
    () => hand.find(card => card.id === selected) ?? null,
    [hand, selected]
  );

  function playCard(cardId: string, position: Position) {
    const card = game.player.hand.find(candidate => candidate.id === cardId);
    if (!card || !legalPositions(game.player).includes(position)) return;
    const played: EnginePlay = { card, position, finalPower: card.power };
    setGame(current => ({
      ...current,
      player: {
        ...current.player,
        hand: current.player.hand.filter(candidate => candidate.id !== cardId),
        roundPlays: [...current.player.roundPlays, played]
      }
    }));
    setSelected(null);
    setHoveredPosition(null);
    setLastAction(`${card.name} → ${positionLabels[position]}`);
  }

  function zoneAt(x: number, y: number): Position | null {
    const element = document.elementFromPoint(x, y);
    const zone = element?.closest<HTMLElement>('[data-side="player"][data-position]');
    const position = (zone?.dataset.position as Position | undefined) ?? null;
    return position && legalPositions(game.player).includes(position) ? position : null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, card: CardDefinition) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      cardId: card.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    setDrag(current => {
      if (!current || current.pointerId !== event.pointerId) return current;
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
      const moved = current.moved || distance > 8;
      if (moved) {
        event.preventDefault();
        setHoveredPosition(zoneAt(event.clientX, event.clientY));
      }
      return { ...current, x: event.clientX, y: event.clientY, moved };
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag;
    if (!current || current.pointerId !== event.pointerId) return;

    const destination = current.moved ? zoneAt(event.clientX, event.clientY) : null;
    if (destination) {
      playCard(current.cardId, destination);
    } else if (!current.moved) {
      setSelected(value => value === current.cardId ? null : current.cardId);
      setLastAction("Tocá una posición o arrastrá la carta.");
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setHoveredPosition(null);
  }

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
            <b>5</b>
          </div>
          <div className="duel-status">
            <strong>{game.duelScore.player} — {game.duelScore.opponent}</strong>
            <span>DUELO {game.turn} · VOS ABRÍS</span>
          </div>
          <button className="utility-button" type="button" aria-label="Abrir registro">≡</button>
        </section>

        <section className="battlefield" aria-label="Tablero">
          {positions.map(position => (
            <div className="lane" key={position}>
              <Slot
                side="opponent"
                position={position}
                cards={game.opponent.roundPlays.filter(play => play.position === position)}
                archive={game.opponent.archives[position].length}
                active={false}
                capacityValue={capacity(game.opponent, position)}
              />

              <div className="lane-axis">
                <span>{positionLabels[position]}</span>
                <i />
              </div>

              <Slot
                side="player"
                position={position}
                cards={game.player.roundPlays.filter(play => play.position === position)}
                archive={game.player.archives[position].length}
                active={(hoveredPosition === position || (!!selectedCard && !drag)) && legalPositions(game.player).includes(position)}
                capacityValue={capacity(game.player, position)}
                onTap={() => selectedCard && playCard(selectedCard.id, position)}
              />
            </div>
          ))}
        </section>

        <div className="action-line" role="status">{lastAction}</div>

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
            {hand.map(card => (
              <button
                className={`hand-card ${selected === card.id ? "is-selected" : ""}`}
                type="button"
                key={card.id}
                onPointerDown={event => handlePointerDown(event, card)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  setDrag(null);
                  setHoveredPosition(null);
                }}
              >
                <CardFace card={card} selected={selected === card.id} />
              </button>
            ))}
            {hand.length === 0 && <div className="empty-hand">Mano vacía · demo de interacción</div>}
          </div>
        </section>
      </div>

      {drag && (() => {
        const card = hand.find(candidate => candidate.id === drag.cardId);
        if (!card || !drag.moved) return null;
        return (
          <div
            className="drag-layer"
            style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0)` }}
          >
            <CardFace card={card} ghost />
          </div>
        );
      })()}
    </main>
  );
}
