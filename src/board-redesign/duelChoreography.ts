/**
 * Pure presentation contract for one resolved duel.
 * The engine supplies the final Power, outcome and explanatory notes.
 * No gameplay state is modified by this sequence.
 */
import type { EnginePlay } from "../engine/types";

export type DuelBeat = "approach" | "player-power" | "opponent-power" | "compare" | "impact" | "result";

export const DUEL_BEATS: ReadonlyArray<{ at: number; beat: DuelBeat }> = [
  { at: 0, beat: "approach" },
  { at: 930, beat: "player-power" },
  { at: 1240, beat: "opponent-power" },
  { at: 1730, beat: "compare" },
  { at: 2070, beat: "impact" },
  { at: 2420, beat: "result" }
];
export const DUEL_FINISH_MS = 3700;

/** The values appear in sequence; both remain visible for the quiet comparison beat. */
export function powerIsRevealed(beat: DuelBeat, side: "player" | "opponent"): boolean {
  if (side === "player") return beat !== "approach";
  return beat === "opponent-power" || beat === "compare" || beat === "impact" || beat === "result";
}

/** Use the authoritative rules-engine notes rather than re-evaluating card abilities. */
export function duelPowerReasons(play: EnginePlay): { visible: string[]; hidden: number } {
  const notes = (play.notes ?? []).map(note => note.trim()).filter(Boolean);
  if (!notes.length && play.card.effect === "augury_match3") {
    return { visible: ["Augurio fallido · posiciones diferentes"], hidden: 0 };
  }
  return { visible: notes.slice(0, 3), hidden: Math.max(0, notes.length - 3) };
}
