import Phaser from "phaser";
import type { BoardLayout, Lane, Rect } from "./layout";

/**
 * Ceremonial visual skin. Geometry and decoration only:
 * never decides a legal position, reads hidden cards or changes game rules.
 * The underlying Rects in layout.ts remain the source of input hit targets.
 */
const GOLD = 0xcaa66b;
const LIGHT = 0xe8d4a8;
const SHADOW = 0x080c11;

function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color = GOLD, alpha = .55) {
  g.lineStyle(1.2, color, alpha);
  g.lineBetween(x, y - r, x + r, y);
  g.lineBetween(x + r, y, x, y + r);
  g.lineBetween(x, y + r, x - r, y);
  g.lineBetween(x - r, y, x, y - r);
}

export function drawStoneAltar(scene: Phaser.Scene, layout: BoardLayout) {
  const r = layout.arena;
  const g = scene.add.graphics();
  const narrow = layout.mode === "mobile";
  const margin = narrow ? 2 : 8;
  g.fillStyle(0x070f17, .66);
  g.fillRoundedRect(r.x + margin, r.y + 1, r.w - margin * 2, r.h - 2, narrow ? 4 : 12);
  g.lineStyle(3, 0x322d26, .93);
  g.strokeRoundedRect(r.x + margin, r.y + 1, r.w - margin * 2, r.h - 2, narrow ? 4 : 12);
  g.lineStyle(1.2, GOLD, .53);
  g.strokeRoundedRect(r.x + margin + 4, r.y + 5, r.w - margin * 2 - 8, r.h - 10, 7);
  g.lineStyle(1, LIGHT, .17);
  g.strokeRoundedRect(r.x + margin + 9, r.y + 10, r.w - margin * 2 - 18, r.h - 20, 5);
  const center = r.x + r.w / 2;
  const radius = Math.min(r.w * .34, r.h * .39);
  g.lineStyle(1.1, GOLD, .12);
  for (let i = 0; i < 4; i++) g.strokeCircle(center, r.y + r.h / 2, radius * (.45 + i * .22));
  g.lineStyle(1, GOLD, .30);
  g.lineBetween(r.x + 18, r.y + 6, r.x + r.w - 18, r.y + 6);
  g.lineBetween(r.x + 18, r.y + r.h - 6, r.x + r.w - 18, r.y + r.h - 6);
  diamond(g, center, r.y + 8, narrow ? 5 : 9, GOLD, .65);
  diamond(g, center, r.y + r.h - 8, narrow ? 5 : 9, GOLD, .65);
}

/** The tall paired gothic window motif spans both duel slots per position. */
export function drawLanePortal(scene: Phaser.Scene, upper: Rect, axis: Rect, lower: Rect, lane: Lane, mobile: boolean) {
  const g = scene.add.graphics();
  const x = upper.x + 2;
  const y = upper.y + 1;
  const w = upper.w - 4;
  const h = lower.y + lower.h - y - 1;
  const apex = mobile ? Math.min(16, upper.h * .17) : Math.min(36, upper.h * .25);
  const cx = x + w / 2;
  // Outer shadow, pointed cathedral apex, double gold tracing.
  g.fillStyle(SHADOW, .40);
  g.fillRoundedRect(x + 1, y + apex, w - 2, h - apex, mobile ? 5 : 14);
  for (const [offset, weight, color, alpha] of [
    [0, 3.4, 0x5d4b33, .98],
    [4, 1.4, GOLD, .73],
    [9, 1.0, LIGHT, .20]
  ] as const) {
    const left = x + offset;
    const right = x + w - offset;
    const top = y + offset;
    const bottom = y + h - offset;
    const peak = y - apex * .25 + offset;
    g.lineStyle(weight, color, alpha);
    g.beginPath();
    g.moveTo(left, bottom - (mobile ? 7 : 15));
    g.lineTo(left, top + apex);
    g.lineTo(left + w * .16, top + apex * .32);
    g.lineTo(cx, peak);
    g.lineTo(right - w * .16, top + apex * .32);
    g.lineTo(right, top + apex);
    g.lineTo(right, bottom - (mobile ? 7 : 15));
    g.lineTo(right - (mobile ? 7 : 15), bottom);
    g.lineTo(left + (mobile ? 7 : 15), bottom);
    g.closePath();
    g.strokePath();
  }
  const mark = lane === "trono" ? GOLD : lane === "siniestra" ? 0x85abb6 : 0xb8876c;
  diamond(g, cx, y + Math.max(5, apex * .36), mobile ? 3.6 : 8, mark, .85);
  g.lineStyle(1, GOLD, .32);
  g.lineBetween(x + 12, axis.y + axis.h / 2, x + w - 12, axis.y + axis.h / 2);
  // Tiny finials echo carved altar architecture.
  for (const yy of [axis.y - 3, axis.y + axis.h + 3]) {
    diamond(g, x + 8, yy, mobile ? 2 : 3, GOLD, .42);
    diamond(g, x + w - 8, yy, mobile ? 2 : 3, GOLD, .42);
  }
}

export function drawRitualSlot(scene: Phaser.Scene, r: Rect, own: boolean, legal: boolean, mobile: boolean) {
  const g = scene.add.graphics();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const tint = own ? 0xc7a16d : 0x92b8bf;
  const inset = mobile ? 5 : 11;
  g.fillStyle(own ? 0x1d1a19 : 0x11212a, legal ? .32 : .24);
  g.fillRoundedRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, 6);
  g.lineStyle(1.2, tint, legal ? .44 : .20);
  g.strokeRoundedRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, 6);
  const rad = Math.min(r.w * .36, r.h * .33);
  for (const [ratio, opacity] of [[1, .21], [.75, .16], [.35, .13]] as const) {
    g.lineStyle(1, tint, opacity);
    g.strokeCircle(cx, cy, rad * ratio);
  }
  g.lineStyle(1.1, tint, .22);
  g.lineBetween(cx - rad * 1.10, cy, cx + rad * 1.10, cy);
  g.lineBetween(cx, cy - rad * 1.10, cx, cy + rad * 1.10);
  diamond(g, cx, cy, rad * .48, tint, .22);
  // The carved points remain visible when the center fills with a card.
  const x0 = r.x + inset + 5;
  const x1 = r.x + r.w - inset - 5;
  for (const [x, dir] of [[x0, 1], [x1, -1]]) {
    g.lineStyle(1.3, tint, .43);
    g.lineBetween(x, cy - 12, x + dir * 8, cy);
    g.lineBetween(x + dir * 8, cy, x, cy + 12);
  }
  if (legal) {
    g.lineStyle(1.5, GOLD, .35);
    g.lineBetween(r.x + inset, r.y + inset, r.x + inset + 23, r.y + inset);
    g.lineBetween(r.x + r.w - inset - 23, r.y + r.h - inset, r.x + r.w - inset, r.y + r.h - inset);
  }
}

export function drawPositionPlaque(scene: Phaser.Scene, r: Rect, lane: Lane, mobile: boolean) {
  const g = scene.add.graphics();
  const height = Math.min(mobile ? 23 : 34, r.h - 3);
  const cy = r.y + r.h / 2;
  const x = r.x + Math.max(5, r.w * .055);
  const w = r.w - 2 * (x - r.x);
  g.fillStyle(0x080e13, .94);
  g.fillRoundedRect(x + 10, cy - height / 2, w - 20, height, 4);
  g.lineStyle(2.1, 0x594a33, .94);
  g.strokeRoundedRect(x + 10, cy - height / 2, w - 20, height, 4);
  g.lineStyle(1.1, GOLD, .84);
  g.strokeRoundedRect(x + 13, cy - height / 2 + 3, w - 26, height - 6, 3);
  diamond(g, x + 11, cy, mobile ? 4 : 7, GOLD, .82);
  diamond(g, x + w - 11, cy, mobile ? 4 : 7, GOLD, .82);
  if (!mobile) {
    g.lineStyle(1, GOLD, .24);
    g.lineBetween(x + 25, cy, x + 42, cy);
    g.lineBetween(x + w - 42, cy, x + w - 25, cy);
  }
  const glyph = lane === "trono" ? "♛" : lane === "siniestra" ? "☾" : "☼";
  scene.add.text(r.x + r.w / 2, cy - height * .55 - (mobile ? 2 : 4), glyph, {
    fontFamily: "Georgia, serif", fontSize: (mobile ? 12 : 18) + "px", color: "#c5a16d"
  }).setOrigin(.5);
}

export function drawArchivePlate(scene: Phaser.Scene, r: Rect, own: boolean, mobile: boolean) {
  const g = scene.add.graphics();
  const cy = own ? r.y + r.h - 14 : r.y + 15;
  const w = Math.min(r.w - 14, mobile ? 107 : 151);
  const h = mobile ? 17 : 22;
  g.fillStyle(0x070c10, .90);
  g.fillRoundedRect(r.x + (r.w - w) / 2, cy - h / 2, w, h, 4);
  g.lineStyle(1, own ? GOLD : 0x83a6ab, .48);
  g.strokeRoundedRect(r.x + (r.w - w) / 2 + .5, cy - h / 2 + .5, w - 1, h - 1, 4);
  diamond(g, r.x + (r.w - w) / 2 + 7, cy, 2.5, GOLD, .55);
  diamond(g, r.x + (r.w + w) / 2 - 7, cy, 2.5, GOLD, .55);
}

export function drawVelvetDock(scene: Phaser.Scene, r: Rect, mobile: boolean) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x341a1d, 0x341a1d, 0x100f16, 0x100f16, .98, .98, 1, 1);
  g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(0x5e282e, .20);
  g.fillEllipse(r.x + r.w / 2, r.y + r.h * .57, Math.min(r.w * .94, 700), r.h * 1.05);
  g.lineStyle(5, 0x080b0e, .9);
  g.lineBetween(r.x, r.y, r.x + r.w, r.y);
  g.lineStyle(2, GOLD, .73);
  g.lineBetween(r.x + 9, r.y + 3, r.x + r.w - 9, r.y + 3);
  g.lineStyle(1, GOLD, .18);
  g.lineBetween(r.x + 8, r.y + 8, r.x + r.w - 8, r.y + 8);
  const cy = r.y + r.h * .59;
  const ornamentDistance = mobile ? r.w * .42 : Math.min(r.w * .38, 380);
  for (const dir of [-1, 1]) {
    const cx = r.x + r.w / 2 + dir * ornamentDistance;
    g.lineStyle(2, GOLD, .17);
    g.strokeCircle(cx, cy, mobile ? 22 : 37);
    g.strokeCircle(cx, cy, mobile ? 13 : 24);
    g.lineBetween(cx - 24, cy, cx + 24, cy);
    g.lineBetween(cx, cy - 24, cx, cy + 24);
    diamond(g, cx, cy, mobile ? 8 : 13, GOLD, .26);
  }
  for (let i = 0; i < 6; i++) {
    const x = r.x + (i + .5) / 6 * r.w;
    g.lineStyle(1, 0xe0b98a, .05);
    g.lineBetween(x, r.y + 13, x - 22, r.y + r.h - 8);
  }
}

export function drawFrameCorners(scene: Phaser.Scene, r: Rect, tint: number, mobile: boolean) {
  const g = scene.add.graphics();
  const len = mobile ? 12 : 25;
  const off = mobile ? 3 : 7;
  g.lineStyle(mobile ? 1.2 : 2, tint, .68);
  for (const [x, y, dx, dy] of [
    [r.x + off, r.y + off, 1, 1],
    [r.x + r.w - off, r.y + off, -1, 1],
    [r.x + off, r.y + r.h - off, 1, -1],
    [r.x + r.w - off, r.y + r.h - off, -1, -1]
  ]) {
    g.lineBetween(x, y, x + dx * len, y);
    g.lineBetween(x, y, x, y + dy * len);
    diamond(g, x + dx * 3, y + dy * 3, mobile ? 2 : 3, tint, .6);
  }
}
