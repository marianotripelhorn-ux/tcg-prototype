import { describe, expect, it } from "vitest";
import { DUEL_BEATS, DUEL_FINISH_MS, duelPowerReasons, powerIsRevealed } from "./duelChoreography";
import type { EnginePlay } from "../engine/types";

describe("duel choreography is presentation-only and deterministic", () => {
  it("has strictly ordered beats and a final readable result hold", () => {
    expect(DUEL_BEATS.map(b => b.beat)).toEqual([
      "approach", "player-power", "opponent-power", "compare", "impact", "result"
    ]);
    expect(DUEL_BEATS.every((b, i) => i === 0 || b.at > DUEL_BEATS[i - 1].at)).toBe(true);
    expect(DUEL_FINISH_MS - DUEL_BEATS[DUEL_BEATS.length - 1].at).toBeGreaterThan(1000);
  });

  it("never reveals a side's final value early", () => {
    expect(powerIsRevealed("approach", "player")).toBe(false);
    expect(powerIsRevealed("player-power", "opponent")).toBe(false);
    expect(powerIsRevealed("opponent-power", "opponent")).toBe(true);
    expect(powerIsRevealed("compare", "player")).toBe(true);
    expect(powerIsRevealed("result", "opponent")).toBe(true);
  });

  it("uses the exact engine notes for modifier explanations", () => {
    const play = { card: { effect: "augury_match3" }, notes: ["+3 Augurio · misma posición", "−2 Corte Sinistral"] } as EnginePlay;
    expect(duelPowerReasons(play).visible).toEqual(play.notes);
    expect(duelPowerReasons({ ...play, notes: [] }).visible).toEqual([
      "Augurio fallido · posiciones diferentes"
    ]);
  });

  it("shows a bounded set of notes without losing their count", () => {
    const play = { card: { effect: "bonus2" }, notes: ["a", "b", "c", "d"] } as EnginePlay;
    expect(duelPowerReasons(play)).toEqual({ visible: ["a", "b", "c"], hidden: 1 });
  });
});
