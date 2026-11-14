import { createElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Slot } from "../App";
import { startGame } from "../engine/game";
import type { EnginePlay } from "../engine/types";

type Clickable = {
  className?: string;
  children?: ReactNode;
  onClick?: (event: {stopPropagation: () => void}) => void;
};

function findByClass(node: ReactNode, className: string): ReactElement<Clickable> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByClass(child, className);
      if (found) return found;
    }
  } else if (isValidElement<Clickable>(node)) {
    if (node.props.className?.split(" ").includes(className)) return node;
    return findByClass(node.props.children, className);
  }
}

function fixture(overrides: Partial<ComponentProps<typeof Slot>> = {}) {
  const game = startGame("dextral", "sinistral", () => 0.5, "player", "normal");
  const played: EnginePlay = {card: game.player.hand[0], position: "diestra", finalPower: 7};
  const props: ComponentProps<typeof Slot> = {
    side: "player", position: "diestra", cards: [played], archive: 5,
    active: false, capacityValue: 2,
    onInspect: vi.fn(), onManifestInspect: vi.fn(), ...overrides
  };
  return {props, played};
}

describe("Redesigned board slots preserve playable information", () => {
  it("separates the archived count from the occupied-capacity count", () => {
    const {props} = fixture();
    const html = renderToStaticMarkup(createElement(Slot, props));
    expect(html).toContain('aria-label="Archivo: 5 cartas"');
    expect(html).toContain('class="archive-caption">ARCHIVO </span>5');
    expect(html).toContain('aria-label="Ocupación: 1 de 2"');
    expect(html).toContain('>1/2</span>');
  });

  it("keeps completed cards distinct from the current duel card", () => {
    const {props, played} = fixture();
    const completed = renderToStaticMarkup(createElement(Slot, props));
    const focused = renderToStaticMarkup(createElement(Slot, {...props, focusPlay: played}));
    expect(completed).toContain('class="battle-card ');
    expect(completed).not.toContain('class="current-board-card');
    expect(focused).toContain('class="current-board-card');
    expect(focused.match(/class="played-card"/g)).toHaveLength(1);
  });

  it("shows an unresolved rival opening without inventing its final Power", () => {
    const {props, played} = fixture({side: "opponent", cards: []});
    const pending: EnginePlay = {...played, finalPower: undefined, powerExact: false};
    const html = renderToStaticMarkup(createElement(Slot, {
      ...props, focusPlay: pending, pendingCard: pending
    }));
    expect(html).toContain('current-board-card pending');
    expect(html).toContain('class="card-power">?</div>');
    expect(html.match(/class="played-card current-play"/g)).toHaveLength(1);
  });

  it("retains three separate cards and dynamic capacity for expanded Champion lanes", () => {
    const {props, played} = fixture();
    const html = renderToStaticMarkup(createElement(Slot, {
      ...props, cards: [played, {...played}, {...played}], capacityValue: 3
    }));
    expect(html).toContain('aria-label="Ocupación: 3 de 3"');
    expect(html.match(/class="played-card"/g)).toHaveLength(3);
    expect(html.match(/aria-label="Inspeccionar /g)).toHaveLength(3);
  });

  it("keeps archived Dagger copying functional without submitting a lane play", () => {
    const {props, played} = fixture();
    const onCopyArchive = vi.fn();
    const onTap = vi.fn();
    const tree = Slot({
      ...props, archiveCards: [{...played.card, specialArchiveKind: "dagger"}],
      onCopyArchive, onTap
    });
    const control = findByClass(tree, "manifest-archive-button");
    const stopPropagation = vi.fn();
    expect(control).toBeDefined();
    control!.props.onClick!({stopPropagation});
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onCopyArchive).toHaveBeenCalledOnce();
    expect(onTap).not.toHaveBeenCalled();
    expect(props.onManifestInspect).not.toHaveBeenCalled();
  });

  it("preserves archived Relic inspection when no copy action applies", () => {
    const {props, played} = fixture();
    const tree = Slot({...props, archiveCards: [{...played.card, specialArchiveKind: "relic"}]});
    const control = findByClass(tree, "manifest-archive-button");
    const stopPropagation = vi.fn();
    control!.props.onClick!({stopPropagation});
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(props.onManifestInspect).toHaveBeenCalledWith("relic");
  });
});
