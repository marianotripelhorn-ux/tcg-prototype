import Phaser from "phaser";
import { blueCards, redCards } from "../src/data";
import { champions } from "../src/engine/champions";
import { answerQuiero, startGame, submitPlayerPlay } from "../src/engine/game";
import { legalPositions } from "../src/engine/rules";
import type { EnginePlay, GameState } from "../src/engine/types";
import type { CardDefinition, Position } from "../src/types";
import { getLayout, getDropLane, lanes, clamp, type BoardLayout, type Lane, type Rect } from "./layout";
import "./style.css";

/**
 * Phaser owns presentation and input; src/engine is the only rules authority.
 * This is the first playable single-matchup vertical slice, not a new engine.
 */
const LABELS: Record<Lane, string> = { siniestra: "SINIESTRA", trono: "TRONO", diestra: "DIESTRA" };
const C = {
  ink: 0x0b1115, panel: 0x131c20, slot: 0x172329, gold: 0xc7aa70,
  pale: 0xf6e9d5, line: 0x6a604c, red: 0xac604b, teal: 0x83b3b0,
  black: 0x070c0e, ivory: 0xe8d6b1, ember: 0x9b5945, midnight: 0x071116
};
const ASSETS = new URL("./", window.location.href).href;
const spriteSources = [...new Set([...redCards, ...blueCards].map(card => card.art?.sprite).filter((path): path is string => Boolean(path)))];
const sheetKeys = new Map(spriteSources.map((source, index) => [source, "card-sheet-" + index]));

function bootStatus(message: string, failed = false) {
  const el = document.getElementById("boot-status");
  if (!el) return;
  el.textContent = message;
  el.dataset.status = failed ? "failed" : "ready";
}
window.addEventListener("error", event => bootStatus("ERROR: " + (event.error?.message || event.message), true));
window.addEventListener("unhandledrejection", event => bootStatus("ERROR: " + String(event.reason), true));

class DaggerScene extends Phaser.Scene {
  private layout!: BoardLayout;
  private state!: GameState;
  private selected: number | null = null;
  private draggingIndex: number | null = null;
  private draggingPosition: { x: number; y: number } | null = null;
  private highlighted: Lane | null = null;
  private hovered: number | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private cardObjects = new Map<number, Phaser.GameObjects.Container>();
  private playerSlots = new Map<Lane, Phaser.GameObjects.Rectangle>();
  private statusText: Phaser.GameObjects.Text | null = null;
  private toast = "";
  private resizing = () => this.rebuild();

  constructor() { super("DaggerlightPlayable"); }

  create() {
    this.state = startGame("dextral", "sinistral", Math.random, "player", "normal");
    this.input.dragDistanceThreshold = 8;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizing);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.resizing));
    (window as Window & { __daggerlightPhaserDebug?: () => unknown }).__daggerlightPhaserDebug = () => ({
      layout: this.layout,
      selectedIndex: this.selected,
      draggingIndex: this.draggingIndex,
      dragPosition: this.draggingPosition,
      used: this.state.player.roundPlays.map((play, i) => [i, play.position]),
      state: {
        round: this.state.round, turn: this.state.turn, phase: this.state.phase,
        playerLife: this.state.player.life, opponentLife: this.state.opponent.life,
        hand: this.state.player.hand.map(card => card.id),
        playerPlays: this.state.player.roundPlays.map(play => [play.card.id, play.position]),
        opponentPlays: this.state.opponent.roundPlays.map(play => [play.card.id, play.position]),
        lastDuel: this.state.lastDuel?.turn ?? null,
        roundsCompleted: this.state.rounds.length
      }
    });
    try {
      this.rebuild(); // Canvas must work even when every image request fails.
    } catch (error) {
      console.error("Phaser initial render failed", error);
      bootStatus("NO SE PUDO DIBUJAR EL TABLERO: " + String(error), true);
      return;
    }

    // The static artwork is enhancement, never a prerequisite for interaction.
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      for (const [source, key] of sheetKeys) {
        if (!this.textures.exists(key)) continue;
        try {
          const image = this.textures.get(key).getSourceImage() as HTMLImageElement;
          const sprite = key + "-cells";
          if (!this.textures.exists(sprite)) {
            this.textures.addSpriteSheet(sprite, image, {
              frameWidth: Math.floor(image.width / 3),
              frameHeight: Math.floor(image.height / 2),
              endFrame: 5
            });
          }
        } catch (error) { console.warn("Sprite sheet unavailable", source, error); }
      }
      if (this.draggingIndex === null) this.rebuild();
    });
    const portraits = [
      ["playerFace", "champions/faces/dextral.webp"],
      ["rivalFace", "champions/faces/sinistral.webp"],
      ["backdrop", "branding/menu/background-dark.webp"],
      ["redAtmosphere", "champions/backgrounds/red.webp"],
      ["blueAtmosphere", "champions/backgrounds/blue.webp"],
      ["logo", "branding/logo.png"]
    ];
    portraits.forEach(([key, url]) => this.load.image(key, new URL(url, ASSETS).href));
    sheetKeys.forEach((key, source) => this.load.image(key, new URL(source, ASSETS).href));
    this.load.start();
  }

  private panel(r: Rect, fill: number, stroke = C.line, alpha = 1, radius = 7, interactive = false) {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, alpha);
    graphics.fillRoundedRect(r.x, r.y, r.w, r.h, radius);
    graphics.lineStyle(1, stroke, .8);
    graphics.strokeRoundedRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1, radius);
    if (!interactive) return graphics;
    const hit = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    return hit;
  }

  private label(value: string, x: number, y: number, size = 12, color = "#e7d7b8", kind: "ui" | "serif" = "ui") {
    return this.add.text(x, y, value, {
      fontFamily: kind === "serif" ? "Georgia, Times New Roman, serif" : "Arial, sans-serif",
      fontSize: size + "px",
      fontStyle: kind === "serif" ? "normal" : "bold",
      color,
      align: "center"
    }).setOrigin(.5);
  }

  private hairline(x1: number, y1: number, x2: number, y2: number, color = C.gold, alpha = .5, width = 1) {
    const g = this.add.graphics();
    g.lineStyle(width, color, alpha);
    g.lineBetween(x1, y1, x2, y2);
  }

  /** Painterly atmospheric layers stay below every interactive card and hit area. */
  private backdrop() {
    const { width: w, height: h, mode } = this.layout;
    this.add.rectangle(w / 2, h / 2, w, h, C.midnight);
    if (this.textures.exists("backdrop")) {
      const art = this.add.image(w / 2, h / 2, "backdrop");
      const source = art.texture.getSourceImage() as HTMLImageElement;
      const scale = Math.max(w / Math.max(1, source.width), h / Math.max(1, source.height));
      art.setScale(scale).setAlpha(.58);
    }
    const atmosphere = this.add.graphics();
    atmosphere.fillGradientStyle(0x09131b, 0x09131b, 0x182027, 0x182027, .72, .72, .9, .9);
    atmosphere.fillRect(0, 0, w, h);
    // Soft light pools, concentric seals and dark framing establish a tabletop.
    const cx = mode === "desktop" ? w * .66 : w * .5;
    const cy = h * .48;
    for (let i = 9; i >= 1; i--) {
      atmosphere.fillStyle(0xb18b57, .006 + (10 - i) * .0015);
      atmosphere.fillEllipse(cx, cy, w * (.40 + i * .085), h * (.24 + i * .068));
    }
    for (let i = 0; i < 7; i++) {
      atmosphere.lineStyle(i % 2 === 0 ? 1.4 : .7, C.gold, .028 + (i % 2) * .014);
      atmosphere.strokeEllipse(cx, cy, h * (.36 + i * .115), h * (.36 + i * .115));
    }
    // Tiny fixed motes add material depth without a permanent animation cost.
    for (let i = 0; i < 82; i++) {
      const px = ((i * 7919 + 149) % 997) / 997 * w;
      const py = ((i * 4211 + 337) % 991) / 991 * h;
      atmosphere.fillStyle(i % 4 ? 0xc4ad81 : 0x8ca9ad, .065 + (i % 5) * .015);
      atmosphere.fillCircle(px, py, i % 9 === 0 ? 1.4 : .65);
    }
    atmosphere.fillGradientStyle(0x020608, 0x020608, 0x020608, 0x020608, .14, .14, .42, .42);
    atmosphere.fillRect(0, 0, w, h);
    const trim = this.add.graphics();
    trim.lineStyle(2, C.gold, .16);
    trim.strokeRect(7, 7, w - 14, h - 14);
    trim.lineStyle(1, C.gold, .12);
    trim.strokeRect(11, 11, w - 22, h - 22);
  }

  private drawTopbar() {
    const { topbar: t, width: w, mode } = this.layout;
    const bar = this.add.graphics();
    bar.fillGradientStyle(0x0b1318, 0x0b1318, 0x1c2428, 0x1c2428, .98, .98, .95, .95);
    bar.fillRect(0, 0, w, t.h);
    this.hairline(16, 6, w - 16, 6, C.gold, .16);
    this.hairline(0, t.h - 1, w, t.h - 1, C.gold, .6);
    this.label("D A G G E R L I G H T", mode === "mobile" ? 93 : 153, t.h / 2,
      mode === "mobile" ? 11 : 17, "#edd9af", "serif");
    this.label("RONDA " + this.state.round + "  ·  DUELO " + this.state.turn,
      mode === "mobile" ? w - 93 : w / 2, t.h / 2,
      mode === "mobile" ? 10 : 13, "#f8eddd");
    if (mode === "desktop") {
      this.label("PHASER  /  ARENA", w - 117, t.h / 2, 10, "#a6b8b6");
    }
  }

  private drawPortrait(rect: Rect, who: "player" | "opponent") {
    const me = who === "player";
    const champion = me ? this.state.player : this.state.opponent;
    const name = champion.champion.name.split(",")[0].toUpperCase();
    const color = me ? C.gold : C.teal;
    const mobile = this.layout.mode === "mobile";
    this.panel(rect, me ? 0x242019 : 0x141f24, color, .85, mobile ? 3 : 9);
    const edge = this.add.graphics();
    edge.lineStyle(2, color, .24);
    edge.strokeRoundedRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, mobile ? 3 : 7);
    edge.lineStyle(1, C.ivory, .13);
    edge.lineBetween(rect.x + 12, rect.y + 12, rect.x + Math.min(rect.w * .42, 92), rect.y + 12);
    if (!mobile) {
      const atmosphere = me ? "redAtmosphere" : "blueAtmosphere";
      if (this.textures.exists(atmosphere)) {
        this.add.image(rect.x + rect.w / 2, rect.y + rect.h / 2, atmosphere)
          .setDisplaySize(rect.w - 8, rect.h - 8).setAlpha(.22);
      }
    }
    const faceKey = me ? "playerFace" : "rivalFace";
    const portraitSize = mobile ? rect.h - 10 : Math.min(rect.w - 26, rect.h * .47);
    const portraitX = mobile ? rect.x + portraitSize / 2 + 6 : rect.x + rect.w / 2;
    const portraitY = mobile ? rect.y + rect.h / 2 : rect.y + rect.h * .31;
    if (this.textures.exists(faceKey)) {
      this.add.image(portraitX, portraitY, faceKey).setDisplaySize(portraitSize, portraitSize);
    } else {
      this.add.circle(portraitX, portraitY, portraitSize * .43, color, .18).setStrokeStyle(1, color, .65);
      this.label(me ? "D" : "S", portraitX, portraitY, 30, "#e9ddbd", "serif");
    }
    const titleX = mobile ? rect.x + portraitSize + 15 : rect.x + rect.w / 2;
    const titleY = mobile ? rect.y + rect.h / 2 - 8 : rect.y + rect.h * .64;
    const titleSize = mobile ? clamp(10, rect.w / 30, 14) : clamp(13, rect.w / 17, 18);
    const nameText = this.label(name, titleX, titleY, titleSize, "#f9ead0", "serif");
    if (mobile) nameText.setOrigin(0, .5);
    if (!mobile) {
      const ability = this.add.text(rect.x + 15, rect.y + rect.h * .73, champion.champion.text, {
        fontFamily: "Arial, sans-serif", fontSize: Math.max(11, rect.w / 23) + "px",
        color: "#c1b5a2", align: "center", wordWrap: { width: rect.w - 30 }, lineSpacing: 3
      }).setOrigin(.0, 0);
      ability.setAlpha(.94);
    } else {
      const sub = this.label(me ? "TU CHAMPION" : "CHAMPION RIVAL",
        titleX, titleY + 19, 9, me ? "#cbb17e" : "#a6c6c3");
      sub.setOrigin(0, .5);
    }
    const lifeX = rect.x + rect.w - (mobile ? 28 : 37);
    const lifeY = mobile ? rect.y + rect.h / 2 : rect.y + rect.h * .55;
    const radius = mobile ? 22 : 29;
    this.add.circle(lifeX, lifeY, radius + 3, 0x0a0e12, .95).setStrokeStyle(2, color, .7);
    this.add.circle(lifeX, lifeY, radius - 4, 0x233034, .9).setStrokeStyle(1, color, .55);
    this.label(String(champion.life), lifeX, lifeY - 1, mobile ? 22 : 29, "#fff0d3", "serif");
    if (!mobile) this.label("VIDA", lifeX, lifeY + 35, 9, "#c1b18d");
  }

  private drawLane(rect: Rect, lane: Lane, side: "player" | "opponent") {
    const own = side === "player";
    const count = (own ? this.state.player : this.state.opponent).archives[lane].length;
    const legal = own && this.state.phase === "awaiting_player" && legalPositions(this.state.player).includes(lane);
    const border = legal ? 0x897a58 : 0x47565a;
    const panel = this.panel(rect, own ? 0x162229 : 0x122027, border, own ? .78 : .62, 8, own);
    if (own && panel instanceof Phaser.GameObjects.Rectangle) {
      this.playerSlots.set(lane, panel);
      panel.on("pointerup", () => {
        if (this.selected !== null && this.draggingIndex === null) this.play(this.selected, lane);
      });
    }
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const decoration = this.add.graphics();
    decoration.lineStyle(1, C.gold, .13);
    decoration.strokeCircle(cx, cy, Math.min(rect.w * .28, rect.h * .40));
    decoration.strokeCircle(cx, cy, Math.min(rect.w * .24, rect.h * .35));
    decoration.lineStyle(1, own ? C.gold : C.teal, .11);
    const crest = Math.min(rect.w * .23, rect.h * .38);
    decoration.lineBetween(cx - crest, cy, cx + crest, cy);
    decoration.lineBetween(cx, cy - crest, cx, cy + crest);
    decoration.strokeDiamond(cx, cy, crest * 1.15, crest * 1.15);
    decoration.lineStyle(1.5, own ? C.gold : C.teal, .25);
    decoration.lineBetween(rect.x + 8, rect.y + 8, rect.x + 30, rect.y + 8);
    decoration.lineBetween(rect.x + 8, rect.y + 8, rect.x + 8, rect.y + 30);
    decoration.lineBetween(rect.x + rect.w - 30, rect.y + rect.h - 8, rect.x + rect.w - 8, rect.y + rect.h - 8);
    decoration.lineBetween(rect.x + rect.w - 8, rect.y + rect.h - 30, rect.x + rect.w - 8, rect.y + rect.h - 8);
    this.hairline(rect.x + 14, rect.y + 13, rect.x + 38, rect.y + 13, C.gold, .4);
    this.hairline(rect.x + rect.w - 38, rect.y + rect.h - 14, rect.x + rect.w - 14, rect.y + rect.h - 14, C.gold, .4);
    if (!legal && own && this.state.phase === "awaiting_player") {
      this.add.rectangle(cx, cy, rect.w - 9, rect.h - 9, 0x000000, .18);
    }

    const stack: EnginePlay[] = (own ? this.state.player : this.state.opponent).roundPlays
      .filter(play => play.position === lane);
    if (!own && this.state.pendingOpponentPlay?.position === lane) {
      stack.push(this.state.pendingOpponentPlay);
    }
    if (stack.length) {
      const cardH = Math.min(rect.h * .74, this.layout.mode === "mobile" ? 145 : 197);
      const cardW = cardH * .707;
      const offsets = stack.length === 1 ? [0] : stack.length === 2 ? [-.18, .18] : [-.26, 0, .26];
      stack.forEach((play, index) => {
        const offset = offsets[index] || 0;
        const x = cx + offset * rect.w;
        const y = cy + (index === 0 ? 0 : (index % 2 ? -1 : 1) * 5);
        this.drawCard(play.card, x, y, cardW, cardH, false);
        if (play.finalPower !== undefined) {
          this.add.circle(x + cardW * .41, y - cardH * .40, 13, 0x10161a, 1)
            .setStrokeStyle(1.5, own ? C.gold : C.teal);
          this.label(String(play.finalPower), x + cardW * .41, y - cardH * .40, 14, "#fff3e0");
        }
      });
    } else {
      this.label(own ? "◇" : "·", cx, cy - 7, this.layout.mode === "mobile" ? 26 : 40, "#5f716f", "serif");
    }
    const archivText = "ARCHIVO  " + String(count).padStart(2, "0");
    this.label(archivText, rect.x + rect.w / 2, own ? rect.y + rect.h - 15 : rect.y + 15,
      this.layout.mode === "mobile" ? 8 : 10, own ? "#b9a079" : "#8fa9a9");
  }

  private drawCard(card: CardDefinition, x: number, y: number, w: number, h: number, interactive = false, index = -1) {
    const surface = this.add.container(x, y);
    const shadow = this.add.rectangle(3, 8, w + 11, h + 12, 0x010406, .42);
    surface.add(this.add.rectangle(1, 4, w + 7, h + 8, 0x040708, .32));
    const frame = this.add.rectangle(0, 0, w + 3, h + 3, 0x171718)
      .setStrokeStyle(1.5, C.gold, .92);
    surface.add([shadow, frame]);
    const innerFrame = this.add.rectangle(0, 0, w - 2, h - 2, 0x000000, 0)
      .setStrokeStyle(1, C.ivory, .23);
    surface.add(innerFrame);
    const sheet = card.art && sheetKeys.get(card.art.sprite);
    if (sheet && this.textures.exists(sheet + "-cells")) {
      const frameIndex = card.art!.row * 3 + card.art!.column;
      const face = this.add.image(0, 0, sheet + "-cells", frameIndex)
        .setDisplaySize(w - 3, h - 3);
      surface.add(face);
    } else {
      const color = card.faction === "red" ? 0x753b32 : 0x2c5a6b;
      surface.add(this.add.rectangle(0, -h * .06, w - 5, h * .84, color, .84));
      const p = this.add.text(-w * .40, -h * .43, String(card.power), {
        fontSize: Math.max(14, w * .18) + "px", fontFamily: "Georgia", fontStyle: "bold", color: "#fff1cd"
      });
      surface.add(p);
      surface.add(this.add.text(-w * .40, h * .24, card.name, {
        fontSize: Math.max(9, w * .095) + "px", fontFamily: "Georgia", color: "#ffecce",
        wordWrap: { width: w * .83 }
      }));
    }
    if (!interactive) { surface.setDepth(8); return surface; }
    surface.setDepth(18).setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains
    );
    this.input.setDraggable(surface, true);
    this.cardObjects.set(index, surface);
    const home = { x, y };
    const lift = this.layout.mode === "mobile" ? 44 : 26;
    let dragged = false;
    surface.on("pointerover", () => {
      if (this.draggingIndex === null && !this.overlay && this.layout.mode === "desktop") {
        this.clearHover();
        this.hovered = index;
        surface.setScale(1.18).setDepth(58);
      }
    });
    surface.on("pointerout", () => { if (!dragged) this.clearHover(); });
    surface.on("pointerdown", () => this.clearHover());
    surface.on("pointerup", () => {
      if (dragged || this.overlay) return;
      if (this.selected === index) this.showInspector(card);
      else {
        this.selected = index;
        this.rebuild();
      }
    });
    surface.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      if (this.overlay || this.state.phase !== "awaiting_player") return;
      dragged = true;
      this.selected = index;
      this.clearHover();
      this.draggingIndex = index;
      surface.setScale(this.layout.mode === "mobile" ? 1.12 : 1.33).setDepth(250);
      surface.setPosition(pointer.x, pointer.y - lift);
      this.draggingPosition = { x: surface.x, y: surface.y };
    });
    surface.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (!dragged || this.overlay) return;
      surface.setPosition(pointer.x, pointer.y - lift);
      this.draggingPosition = { x: surface.x, y: surface.y };
      const hit = getDropLane(this.layout, pointer.x, pointer.y);
      const target = hit && legalPositions(this.state.player).includes(hit) ? hit : null;
      if (target !== this.highlighted) {
        this.highlightLane(target);
        this.showStatus(target ? "SOLTÁ PARA JUGAR EN " + LABELS[target] : "ELEGÍ UNA POSICIÓN LIBRE");
      }
    });
    surface.on("dragend", (pointer: Phaser.Input.Pointer) => {
      if (!dragged) return;
      const hit = getDropLane(this.layout, pointer.x, pointer.y);
      const target = hit && legalPositions(this.state.player).includes(hit) ? hit : null;
      this.draggingIndex = null;
      this.draggingPosition = null;
      this.highlightLane(null);
      surface.disableInteractive();
      if (target) {
        const slot = this.layout.playerSlots[target];
        const finalHeight = Math.min(slot.h * .74, this.layout.mode === "mobile" ? 145 : 197);
        this.tweens.add({
          targets: surface,
          x: slot.x + slot.w / 2,
          y: slot.y + slot.h / 2,
          scale: finalHeight / h,
          duration: 200,
          ease: "Cubic.easeOut",
          onComplete: () => this.play(index, target)
        });
      } else {
        this.tweens.add({
          targets: surface, x: home.x, y: home.y, scale: 1,
          duration: 160, ease: "Quad.easeOut",
          onComplete: () => { this.selected = null; this.rebuild(); }
        });
      }
    });
    return surface;
  }

  private clearHover() {
    if (this.hovered === null) return;
    const old = this.cardObjects.get(this.hovered);
    if (old && this.draggingIndex !== this.hovered) old.setScale(1).setDepth(18);
    this.hovered = null;
  }

  private highlightLane(target: Lane | null) {
    this.highlighted = target;
    for (const [lane, rect] of this.playerSlots) {
      rect.setStrokeStyle(lane === target ? 3 : 0, lane === target ? C.gold : C.line);
      rect.setFillStyle(lane === target ? 0xbb995e : 0x000000, lane === target ? .16 : 0);
    }
  }

  private play(index: number, lane: Lane) {
    if (this.state.phase !== "awaiting_player") return;
    if (!this.state.player.hand[index] || !legalPositions(this.state.player).includes(lane)) return;
    this.selected = null;
    this.clearHover();
    const previousRound = this.state.round;
    const previousLife = [this.state.player.life, this.state.opponent.life];
    try {
      submitPlayerPlay(this.state, index, lane);
    } catch (error) {
      this.toast = String(error);
      this.rebuild();
      return;
    }
    const duel = this.state.lastDuel;
    if (duel) {
      const outcome = duel.outcome === "draw" ? "EMPATE" : duel.outcome === "player" ? "DUELO GANADO" : "DUELO PERDIDO";
      this.toast = outcome + "   ·   " + duel.playerPlay.finalPower + "  —  " + duel.opponentPlay.finalPower;
    }
    if (this.state.round > previousRound) this.toast = "RONDA " + this.state.round + "  ·  EL COMBATE CONTINÚA";
    if (this.state.phase === "finished") this.toast = this.state.winner === "player" ? "VICTORIA" : "DERROTA";
    if (previousLife[0] !== this.state.player.life || previousLife[1] !== this.state.opponent.life) {
      this.cameras.main.shake(110, .0015);
    }
    this.rebuild();
  }

  private choiceButton(text: string, x: number, y: number, w: number, onClick: () => void, primary: boolean) {
    const r = { x: x - w / 2, y: y - 22, w, h: 44 };
    this.panel(r, primary ? 0x9b8053 : 0x1b252a, primary ? 0xf0c98b : 0x8c8e88, 1, 5);
    const frame = this.add.rectangle(x, y, w, 44, 0x000000, 0)
      .setStrokeStyle(1, primary ? 0xf0c98b : 0x8c8e88);
    const hit = this.add.rectangle(x, y, w, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    const title = this.label(text, x, y, 14, primary ? "#11171b" : "#f4e8d8");
    hit.on("pointerup", () => {
      title.setAlpha(.5);
      onClick();
    });
    return [frame, hit, title];
  }

  private drawDecision() {
    if (this.state.phase === "awaiting_player") return;
    const { width, height, mode } = this.layout;
    const boxW = Math.min(mode === "mobile" ? width - 24 : 410, width - 20);
    const panelH = 220;
    const overlay = this.add.container(0, 0).setDepth(500);
    const curtain = this.add.rectangle(width / 2, height / 2, width, height, 0x060b10, .78)
      .setInteractive();
    overlay.add(curtain);
    const frame = this.panel({
      x: (width - boxW) / 2, y: (height - panelH) / 2, w: boxW, h: panelH
    }, 0x142027, C.gold, 1, 12);
    overlay.add(frame);
    const headline = this.state.phase === "finished"
      ? this.state.winner === "player" ? "VICTORIA" : "DERROTA"
      : "¿QUIERO O NO QUIERO?";
    overlay.add(this.label(headline, width / 2, height / 2 - 62, mode === "mobile" ? 23 : 28,
      "#f3dfb7", "serif"));
    overlay.add(this.label(
      this.state.phase === "finished" ? "La partida ha terminado." : "Perdiste los dos primeros duelos.",
      width / 2, height / 2 - 25, 13, "#acbfc0"
    ));
    if (this.state.phase === "finished") {
      this.choiceButton("NUEVA PARTIDA", width / 2, height / 2 + 46, boxW - 52, () => {
        this.state = startGame("dextral", "sinistral", Math.random, "player", "normal");
        this.toast = "";
        this.rebuild();
      }, true).forEach(object => overlay.add(object));
    } else {
      this.choiceButton("NO QUIERO", width / 2 - boxW * .235, height / 2 + 47, boxW * .43,
        () => { answerQuiero(this.state, false); this.toast = "RONDA " + this.state.round; this.rebuild(); },
        false).forEach(object => overlay.add(object));
      this.choiceButton("QUIERO", width / 2 + boxW * .235, height / 2 + 47, boxW * .43,
        () => { answerQuiero(this.state, true); this.toast = "TERCER DUELO"; this.rebuild(); },
        true).forEach(object => overlay.add(object));
    }
    this.overlay = overlay;
  }

  private showInspector(card: CardDefinition) {
    if (this.overlay) return;
    this.clearHover();
    const { width, height } = this.layout;
    const layer = this.add.container(0, 0).setDepth(600);
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x03070b, .88)
      .setInteractive({ useHandCursor: true });
    shade.on("pointerup", () => {
      layer.destroy();
      this.overlay = null;
      this.selected = null;
      this.rebuild();
    });
    layer.add(shade);
    const h = Math.min(height * .70, 500, width * .85 / .707), w = h * .707;
    const preview = this.drawCard(card, width / 2, height / 2 - 16, w, h, false);
    layer.add(preview);
    const hint = this.label("TOCÁ FUERA DE LA CARTA PARA VOLVER", width / 2,
      height / 2 + h / 2 + 5, 11, "#ddc797");
    layer.add(hint);
    this.overlay = layer;
  }

  private showStatus(text: string) { this.statusText?.setText(text); }

  private rebuild() {
    if (!this.state) return;
    this.clearHover();
    this.overlay = null;
    this.cardObjects.clear();
    this.playerSlots.clear();
    this.draggingIndex = null;
    this.draggingPosition = null;
    this.highlighted = null;
    this.children.removeAll(true);
    this.layout = getLayout(this.scale.width, this.scale.height);
    const l = this.layout;
    this.backdrop();
    this.drawTopbar();
    this.drawPortrait(l.opponentBanner, "opponent");
    this.drawPortrait(l.playerBanner, "player");

    const arena = l.arena;
    this.panel(arena, 0x0c171d, 0x7a705a, .28, 5);
    const arenaTrim = this.add.graphics();
    arenaTrim.lineStyle(1, C.gold, .25);
    arenaTrim.lineBetween(arena.x + 18, arena.y + 7, arena.x + arena.w - 18, arena.y + 7);
    arenaTrim.lineBetween(arena.x + 18, arena.y + arena.h - 7, arena.x + arena.w - 18, arena.y + arena.h - 7);
    for (const lane of lanes) {
      this.drawLane(l.opponentSlots[lane], lane, "opponent");
      const labelRect = l.labels[lane];
      this.panel(labelRect, 0x10191d, 0x6b6656, .92, 3);
      this.label(LABELS[lane], labelRect.x + labelRect.w / 2,
        labelRect.y + labelRect.h / 2,
        l.mode === "mobile" ? clamp(11, l.width / 33, 14) : clamp(14, arena.w / 50, 19),
        "#dac393", "serif");
      this.drawLane(l.playerSlots[lane], lane, "player");
    }

    // Active score is independent from the persistent nine-point Life.
    const axisY = l.labels.trono.y + l.labels.trono.h / 2;
    const playerScore = this.state.duelScore.player;
    const rivalScore = this.state.duelScore.opponent;
    const markerX = l.labels.trono.x + l.labels.trono.w / 2;
    if (l.mode === "desktop") {
      this.label(String(rivalScore) + "   :   " + String(playerScore),
        markerX, axisY - l.labels.trono.h * .39, 10, "#c7c6b7");
    }

    this.panel(l.dock, 0x0e171b, 0xa68d5c, .84, 5);
    const dockLight = this.add.graphics();
    dockLight.fillGradientStyle(0x735a35, 0x735a35, 0x0c1419, 0x0c1419, .12, .12, 0, 0);
    dockLight.fillRect(l.dock.x + 4, l.dock.y + 5, l.dock.w - 8, Math.min(44, l.dock.h - 9));
    this.hairline(l.dock.x + 8, l.dock.y + 4, l.dock.x + l.dock.w - 8, l.dock.y + 4, C.gold, .45);
    if (this.state.phase === "awaiting_player") {
      this.state.player.hand.forEach((card, index) => {
        const rect = l.hand[index];
        const selected = this.selected === index;
        const handCard = this.drawCard(card,
          rect.x + rect.w / 2, rect.y + rect.h / 2 - (selected ? 10 : 0),
          rect.w, rect.h, true, index);
        if (selected) {
          handCard.setScale(1.05);
          const ring = this.add.rectangle(handCard.x, handCard.y,
            rect.w + 12, rect.h + 13).setStrokeStyle(2, C.gold).setFillStyle(0, 0);
          ring.setDepth(16);
        }
      });
    }
    const bottomNote = this.state.phase === "awaiting_player"
      ? (this.selected === null ? "ARRASTRÁ UNA CARTA O TOCÁ PARA ELEGIR" : "CARTA SELECCIONADA · ELEGÍ POSICIÓN")
      : (this.state.phase === "finished" ? "PARTIDA FINALIZADA" : "DECISIÓN DE RONDA");
    const statusY = arena.y + Math.min(21, arena.h * .07);
    this.statusText = this.label(this.toast || bottomNote, arena.x + arena.w / 2,
      statusY, l.mode === "mobile" ? 9 : 12,
      this.toast ? "#ffe2a7" : "#c2b6a1");
    this.statusText.setDepth(40);
    this.drawDecision();
    bootStatus("Campo listo");
    document.documentElement.dataset.phaserReady = "true";
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b1115",
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  input: { activePointers: 3 },
  render: { pixelArt: false, antialias: true },
  scene: [DaggerScene]
});
