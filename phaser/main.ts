import Phaser from "phaser";
import { blueCards, redCards } from "../src/data";
import { champions } from "../src/engine/champions";
import { answerQuiero, startGame, submitPlayerPlay } from "../src/engine/game";
import { legalPositions } from "../src/engine/rules";
import type { EnginePlay, GameState } from "../src/engine/types";
import type { CardDefinition, Position } from "../src/types";
import { getLayout, getDropLane, lanes, clamp, type BoardLayout, type Lane, type Rect } from "./layout";
import { drawStoneAltar, drawLanePortal, drawRitualSlot, drawPositionPlaque, drawArchivePlate, drawVelvetDock, drawFrameCorners } from "./visuals";
import cathedralImageB64 from "./art/cathedral-backdrop.base64?raw";
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
        roundsCompleted: this.state.rounds.length,
        ceremonialBackdropLoaded: this.textures.exists("paintedSanctum"),
        artworkMode: this.textures.exists("paintedSanctum") ? "illustrated" : "fallback"
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
    // Decorative scene art is separate from the actual card and Champion graphics.
    // The painterly art is a separate, compressed static resource. Game UI remains live.
    this.load.image("paintedSanctum", "data:image/avif;base64," + cathedralImageB64.trim());
    this.load.svg("sanctum", new URL("./art/sanctum.svg", import.meta.url).href, { width: 1600, height: 1000 });
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

  /** A separate ornamental SVG never contains game-state UI or cards. */
  private backdrop() {
    const { width: w, height: h, mode } = this.layout;
    this.add.rectangle(w / 2, h / 2, w, h, C.midnight);
    if (this.textures.exists("paintedSanctum")) {
      const art = this.add.image(w / 2, h / 2, "paintedSanctum");
      const source = art.texture.getSourceImage() as HTMLImageElement;
      // Portrait screens crop the painterly stage without stretching the artwork.
      const scale = Math.max(w / Math.max(1, source.width), h / Math.max(1, source.height));
      art.setScale(scale).setAlpha(.98);
    } else if (this.textures.exists("sanctum")) {
      const art = this.add.image(w / 2, h / 2, "sanctum");
      const src = art.texture.getSourceImage() as HTMLImageElement;
      const scale = Math.max(w / Math.max(1, src.width), h / Math.max(1, src.height));
      art.setScale(scale).setAlpha(.94);
    } else if (this.textures.exists("backdrop")) {
      const art = this.add.image(w / 2, h / 2, "backdrop");
      const src = art.texture.getSourceImage() as HTMLImageElement;
      art.setScale(Math.max(w / Math.max(1, src.width), h / Math.max(1, src.height))).setAlpha(.6);
    }
    const atmosphere = this.add.graphics();
    // Desaturated stone in the center reserves contrast for the actual cards.
    atmosphere.fillGradientStyle(0x070b0f, 0x070b0f, 0x15121b, 0x15121b, .26, .26, .42, .42);
    atmosphere.fillRect(0, 0, w, h);
    const cx = mode === "desktop" ? w * .67 : w * .5;
    const cy = h * .48;
    for (let i = 6; i >= 1; i--) {
      atmosphere.fillStyle(0xe6b974, .004 + (7 - i) * .002);
      atmosphere.fillEllipse(cx, cy, w * (.25 + i * .10), h * (.17 + i * .07));
    }
    for (let i = 0; i < 55; i++) {
      const px = ((i * 7919 + 149) % 997) / 997 * w;
      const py = ((i * 4211 + 337) % 991) / 991 * h;
      atmosphere.fillStyle(i % 4 ? 0xc4ad81 : 0x8ca9ad, .05 + (i % 5) * .018);
      atmosphere.fillCircle(px, py, i % 9 === 0 ? 1.3 : .65);
    }
    atmosphere.lineStyle(2, C.gold, .27);
    atmosphere.strokeRect(6, 6, w - 12, h - 12);
    atmosphere.lineStyle(1, C.ivory, .11);
    atmosphere.strokeRect(11, 11, w - 22, h - 22);
  }

  private drawTopbar() {
    const { topbar: t, width: w, mode } = this.layout;
    const mobile = mode === "mobile";
    const g = this.add.graphics();
    g.fillGradientStyle(0x090d13, 0x090d13, 0x201c1a, 0x201c1a, .98, .98, .90, .90);
    g.fillRect(0, 0, w, t.h);
    g.lineStyle(2, C.gold, .64);
    g.lineBetween(10, t.h - 2, w - 10, t.h - 2);
    g.lineStyle(1, C.ivory, .22);
    g.lineBetween(14, 6, w - 14, 6);
    const topY = mobile ? 19 : 26;
    const heading = this.label("DAGGERLIGHT", w / 2, topY, mobile ? 21 : 30, "#f3d9a0", "serif");
    heading.setShadow(0, 2, "#0b0805", 5, true, true);
    const round = this.label("RONDA " + this.state.round + "   ·   DUELO " + this.state.turn,
      w / 2, mobile ? 43 : 58, mobile ? 10 : 13, "#e8d2ab", "serif");
    round.setShadow(0, 1, "#000000", 2, true, true);
    const bar = this.add.graphics();
    const wing = mobile ? 110 : 195;
    bar.lineStyle(1, C.gold, .53);
    bar.lineBetween(w / 2 - wing, topY, w / 2 - (mobile ? 88 : 151), topY);
    bar.lineBetween(w / 2 + (mobile ? 88 : 151), topY, w / 2 + wing, topY);
    if (!mobile) {
      this.label("✦", w / 2 - wing - 12, topY, 18, "#cba86e", "serif");
      this.label("✦", w / 2 + wing + 12, topY, 18, "#cba86e", "serif");
    }
  }

  private drawPortrait(rect: Rect, who: "player" | "opponent") {
    const me = who === "player";
    const champion = me ? this.state.player : this.state.opponent;
    const name = champion.champion.name.split(",")[0].toUpperCase();
    const color = me ? 0xc19a60 : 0x82b1bd;
    const mobile = this.layout.mode === "mobile";
    // Portrait plates echo book covers, but their content is always live game state.
    const g = this.add.graphics();
    g.fillGradientStyle(me ? 0x27151a : 0x10242c, me ? 0x27151a : 0x10242c, 0x0b1016, 0x0b1016,
      .95, .95, .98, .98);
    g.fillRoundedRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, mobile ? 4 : 9);
    g.lineStyle(2.3, color, .77);
    g.strokeRoundedRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, mobile ? 4 : 9);
    g.lineStyle(1, C.ivory, .24);
    g.strokeRoundedRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, mobile ? 2 : 7);
    const atmosphere = me ? "redAtmosphere" : "blueAtmosphere";
    if (!mobile && this.textures.exists(atmosphere)) {
      this.add.image(rect.x + rect.w / 2, rect.y + rect.h / 2, atmosphere)
        .setDisplaySize(rect.w - 12, rect.h - 12).setAlpha(.15);
    }
    const faceKey = me ? "playerFace" : "rivalFace";
    const portraitSize = mobile ? rect.h - 10 : Math.min(rect.w * .47, rect.h * .66);
    const portraitX = mobile ? rect.x + portraitSize / 2 + 7 : rect.x + portraitSize / 2 + 13;
    const portraitY = mobile ? rect.y + rect.h / 2 : rect.y + rect.h * .46;
    if (this.textures.exists(faceKey)) {
      this.add.image(portraitX, portraitY, faceKey).setDisplaySize(portraitSize, portraitSize);
    } else {
      this.add.circle(portraitX, portraitY, portraitSize * .43, color, .18).setStrokeStyle(1, color, .65);
      this.label(me ? "D" : "S", portraitX, portraitY, mobile ? 26 : 42, "#e9ddbd", "serif");
    }
    const rim = this.add.graphics();
    rim.lineStyle(2.2, C.gold, .58);
    rim.strokeRoundedRect(portraitX - portraitSize / 2, portraitY - portraitSize / 2,
      portraitSize, portraitSize, mobile ? 3 : 7);
    rim.lineStyle(1, 0xffe8b6, .25);
    rim.strokeRoundedRect(portraitX - portraitSize / 2 + 3, portraitY - portraitSize / 2 + 3,
      portraitSize - 6, portraitSize - 6, 3);
    drawFrameCorners(this, rect, color, mobile);

    const titleX = mobile ? rect.x + portraitSize + 15 : rect.x + rect.w * .70;
    const titleY = mobile ? rect.y + rect.h * .37 : rect.y + rect.h * .23;
    const nameFont = mobile ? clamp(10, rect.w / 32, 13) : clamp(12, rect.w / 19, 17);
    const nameText = this.label(name, titleX, titleY, nameFont, "#fae6be", "serif");
    if (mobile) nameText.setOrigin(0, .5);
    if (!mobile) {
      nameText.setWordWrapWidth(rect.w * .51);
      const ability = this.add.text(rect.x + rect.w * .48, rect.y + rect.h * .66, champion.champion.text, {
        fontFamily: "Georgia, serif", fontSize: clamp(10, rect.w / 26, 13) + "px",
        color: "#d2c2a6", align: "left", wordWrap: { width: rect.w * .47 }, lineSpacing: 3,
        fontStyle: "italic"
      }).setOrigin(0, 0);
      ability.setAlpha(.95);
      g.lineStyle(1, color, .38);
      g.lineBetween(rect.x + rect.w * .50, rect.y + rect.h * .62,
        rect.x + rect.w - 15, rect.y + rect.h * .62);
    } else {
      const sub = this.label(me ? "TU CHAMPION" : "CHAMPION RIVAL",
        titleX, titleY + 18, 9, me ? "#cbb17e" : "#9ac6c8");
      sub.setOrigin(0, .5);
    }
    const lifeX = rect.x + rect.w - (mobile ? 29 : 38);
    const lifeY = mobile ? rect.y + rect.h / 2 : rect.y + rect.h * .45;
    const radius = mobile ? 20 : 28;
    for (const [r, fill, stroke, alpha] of [
      [radius + 5, 0x080b0e, color, .58],
      [radius, me ? 0x58222a : 0x1c4348, C.gold, .83],
      [radius - 6, me ? 0x421b21 : 0x122931, C.ivory, .28]
    ] as const) {
      this.add.circle(lifeX, lifeY, r, fill, .97).setStrokeStyle(r === radius ? 2 : 1, stroke, alpha);
    }
    this.label(String(champion.life), lifeX, lifeY - (mobile ? 1 : 3),
      mobile ? 21 : 27, "#fff0d6", "serif");
    if (!mobile) this.label("VIDA", lifeX, lifeY + 30, 9, "#cdb58b");
  }

  private drawLane(rect: Rect, lane: Lane, side: "player" | "opponent") {
    const own = side === "player";
    const count = (own ? this.state.player : this.state.opponent).archives[lane].length;
    const legal = own && this.state.phase === "awaiting_player" && legalPositions(this.state.player).includes(lane);
    drawRitualSlot(this, rect, own, legal, this.layout.mode === "mobile");
    // Unobtrusive transparent input zone: all real placement rules still come from legalPositions.
    if (own) {
      const hit = this.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2,
        rect.w, rect.h, 0x000000, 0).setInteractive({ useHandCursor: true });
      this.playerSlots.set(lane, hit);
      hit.on("pointerup", () => {
        if (this.selected !== null && this.draggingIndex === null) this.play(this.selected, lane);
      });
    }
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    if (!legal && own && this.state.phase === "awaiting_player") {
      this.add.rectangle(cx, cy, rect.w - 14, rect.h - 14, 0x000000, .14);
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
    drawArchivePlate(this, rect, own, this.layout.mode === "mobile");
    const archivText = "ARCHIVO  " + String(count).padStart(2, "0");
    this.label(archivText, rect.x + rect.w / 2, own ? rect.y + rect.h - 14 : rect.y + 15,
      this.layout.mode === "mobile" ? 8 : 10, own ? "#e3c18b" : "#b1cfce");
  }

  private drawCard(card: CardDefinition, x: number, y: number, w: number, h: number, interactive = false, index = -1) {
    const surface = this.add.container(x, y);
    const shadow = this.add.rectangle(3, 8, w + 11, h + 12, 0x010406, .42);
    surface.add(this.add.rectangle(1, 4, w + 7, h + 8, 0x040708, .32));
    const frame = this.add.rectangle(0, 0, w + 3, h + 3, 0x171718)
      .setStrokeStyle(1.5, C.gold, .92);
    surface.add([shadow, frame]);
    // A second rim is placed *after* the art below so actual card illustrations remain visible.
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
    // Hairline metallic foil + small corner engraving, above the existing real Card Studio art.
    const foil = this.add.graphics();
    foil.lineStyle(2.0, interactive ? 0xe0bf82 : C.gold, interactive ? .92 : .66);
    foil.strokeRoundedRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, 3);
    foil.lineStyle(.9, C.ivory, .25);
    foil.strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 2);
    const corner = Math.min(15, w * .16);
    for (const [px, py, dx, dy] of [
      [-w / 2 + 5, -h / 2 + 5, 1, 1],
      [w / 2 - 5, -h / 2 + 5, -1, 1],
      [-w / 2 + 5, h / 2 - 5, 1, -1],
      [w / 2 - 5, h / 2 - 5, -1, -1]
    ]) {
      foil.lineStyle(1, 0xe8c58b, .48);
      foil.lineBetween(px, py, px + corner * dx, py);
      foil.lineBetween(px, py, px, py + corner * dy);
    }
    surface.add(foil);
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
    // submitPlayerPlay mutates the state synchronously; refresh the narrowed phase after the call.
    const phaseAfterPlay = this.state.phase as GameState["phase"];
    if (phaseAfterPlay === "finished") this.toast = this.state.winner === "player" ? "VICTORIA" : "DERROTA";
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
    drawStoneAltar(this, l);
    for (const lane of lanes) {
      drawLanePortal(this, l.opponentSlots[lane], l.labels[lane], l.playerSlots[lane],
        lane, l.mode === "mobile");
      this.drawLane(l.opponentSlots[lane], lane, "opponent");
      const labelRect = l.labels[lane];
      drawPositionPlaque(this, labelRect, lane, l.mode === "mobile");
      const name = this.label(LABELS[lane], labelRect.x + labelRect.w / 2,
        labelRect.y + labelRect.h / 2,
        l.mode === "mobile" ? clamp(10, l.width / 37, 12) : clamp(14, arena.w / 53, 18),
        "#ead1a0", "serif");
      name.setShadow(0, 1, "#000000", 2, true, true);
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

    drawVelvetDock(this, l.dock, l.mode === "mobile");
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
