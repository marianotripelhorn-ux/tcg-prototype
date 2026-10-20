import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { byId, positionLabels, positions } from "./data";
import { studioThemes } from "./cardStudio";
import type { CardDefinition, PlayedCard, Position } from "./types";

type BoardState = Record<Position, PlayedCard[]>;

type DragState = {
  cardId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};

const emptyBoard = (): BoardState => ({
  siniestra: [],
  trono: [],
  diestra: []
});

const initialOpponent: BoardState = {
  siniestra: [{ card: byId("guardia_dextral"), finalPower: 7 }],
  trono: [],
  diestra: [{ card: byId("abanderado_real"), finalPower: 6 }]
};

const archivePlayer: Record<Position, number> = { siniestra: 2, trono: 1, diestra: 3 };
const archiveOpponent: Record<Position, number> = { siniestra: 1, trono: 2, diestra: 2 };

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
  onTap
}: {
  side: "player" | "opponent";
  position: Position;
  cards: PlayedCard[];
  archive: number;
  active: boolean;
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
  const [hand, setHand] = useState<CardDefinition[]>([
    byId("incendiario"),
    byId("maestro_armas"),
    byId("guardia_castillo")
  ]);
  const [playerBoard, setPlayerBoard] = useState<BoardState>(emptyBoard);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [lastAction, setLastAction] = useState("Arrastrá una carta a una posición.");

  const selectedCard = useMemo(
    () => hand.find(card => card.id === selected) ?? null,
    [hand, selected]
  );

  function playCard(cardId: string, position: Position) {
    const card = hand.find(candidate => candidate.id === cardId);
    if (!card) return;
    setHand(current => current.filter(candidate => candidate.id !== cardId));
    setPlayerBoard(current => ({
      ...current,
      [position]: [...current[position], { card, finalPower: card.power }]
    }));
    setSelected(null);
    setHoveredPosition(null);
    setLastAction(`${card.name} → ${positionLabels[position]}`);
  }

  function zoneAt(x: number, y: number): Position | null {
    const element = document.elementFromPoint(x, y);
    const zone = element?.closest<HTMLElement>('[data-side="player"][data-position]');
    return (zone?.dataset.position as Position | undefined) ?? null;
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
          name="Athos, Capitán de la Guardia Dextral"
          life={6}
          passive="Ganar en Diestra habilita otro espacio."
        />

        <section className="match-strip">
          <div>
            <span>RONDA</span>
            <b>5</b>
          </div>
          <div className="duel-status">
            <strong>1 — 0</strong>
            <span>DUELO 2 · VOS ABRÍS</span>
          </div>
          <button className="utility-button" type="button" aria-label="Abrir registro">≡</button>
        </section>

        <section className="battlefield" aria-label="Tablero">
          {positions.map(position => (
            <div className="lane" key={position}>
              <Slot
                side="opponent"
                position={position}
                cards={initialOpponent[position]}
                archive={archiveOpponent[position]}
                active={false}
              />

              <div className="lane-axis">
                <span>{positionLabels[position]}</span>
                <i />
              </div>

              <Slot
                side="player"
                position={position}
                cards={playerBoard[position]}
                archive={archivePlayer[position]}
                active={hoveredPosition === position || (!!selectedCard && !drag)}
                onTap={() => selectedCard && playCard(selectedCard.id, position)}
              />
            </div>
          ))}
        </section>

        <div className="action-line" role="status">{lastAction}</div>

        <ChampionBar
          side="player"
          name="Majestad Dextral"
          life={8}
          passive="Podés jugar hasta 2 cartas en Diestra."
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
