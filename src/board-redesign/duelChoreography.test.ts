import { describe, expect, it } from "vitest";
import {
  DUEL_BEATS, DUEL_FINISH_MS, duelPowerReasons, powerIsRevealed,
  powerSourceCues, postDuelChampionCues
} from "./duelChoreography";
import type { DuelSummary, EnginePlay, GameState, PlayerState } from "../engine/types";

function play(effect:string,position:"siniestra"|"trono"|"diestra",notes:string[]):EnginePlay {
  return { card:{id:"TEST",power:5,effect}, position, finalPower:7, notes } as EnginePlay;
}
function duel(player:EnginePlay,opponent:EnginePlay,outcome:"player"|"opponent"|"draw"="player"):DuelSummary {
  return {playerPlay:player,opponentPlay:opponent,outcome,turn:1};
}

describe("duel presentation v1.1 is presentation-only and deterministic", () => {
  it("keeps a strict sequence, readable result, and an intentional return beat", () => {
    expect(DUEL_BEATS.map(b => b.beat)).toEqual([
      "approach", "player-power", "opponent-power", "compare", "impact", "result", "settle"
    ]);
    expect(DUEL_BEATS.every((b, i) => i === 0 || b.at > DUEL_BEATS[i - 1].at)).toBe(true);
    expect(DUEL_BEATS[6].at - DUEL_BEATS[5].at).toBeGreaterThanOrEqual(1200);
    expect(DUEL_BEATS[6].at - DUEL_BEATS[5].at).toBeLessThanOrEqual(1300);
    expect(DUEL_FINISH_MS - DUEL_BEATS[6].at).toBeGreaterThanOrEqual(350);
  });

  it("never reveals the other player's Power early, including during settlement", () => {
    expect(powerIsRevealed("approach", "player")).toBe(false);
    expect(powerIsRevealed("player-power", "opponent")).toBe(false);
    expect(powerIsRevealed("opponent-power", "opponent")).toBe(true);
    expect(powerIsRevealed("compare", "player")).toBe(true);
    expect(powerIsRevealed("result", "opponent")).toBe(true);
    expect(powerIsRevealed("settle", "opponent")).toBe(true);
  });

  it("removes redundant Base N and limits external effect lines to two", () => {
    const p=play("archive_here","trono",["Base 5","+2 Archivo","+3 tras Trono","−2 Vor Calasta"]);
    expect(duelPowerReasons(p)).toEqual({
      visible:["+2 Archivo","+3 tras Trono"],hidden:1
    });
  });

  it("does not invent Power for a missed Augurio", () => {
    const p=play("augury_match3","siniestra",["Base 5"]);
    expect(duelPowerReasons(p)).toEqual({
      visible:["Augurio fallido · posiciones diferentes"],hidden:0
    });
  });

  it("only highlights an Archive if the authoritative note names an Archive", () => {
    const p=play("archive_here","trono",["Base 5","+2 Archivo"]);
    expect(powerSourceCues(duel(p,p),"player","empireos")).toEqual([
      {side:"player",kind:"archive",position:"trono"}
    ]);
    expect(powerSourceCues(duel(play("archive_here","trono",["Base 5"]),p),"player","empireos")).toEqual([]);
  });

  it("highlights the rival Archive when its count caused the gain", () => {
    const p=play("opp_archive_more2","diestra",["Base 5","+2 Archivo rival mayor"]);
    expect(powerSourceCues(duel(p,p),"player","empireos")).toEqual([
      {side:"opponent",kind:"archive",position:"diestra"}
    ]);
  });

  it("links confirmed positional effects to the played lane, but avoids generic Power", () => {
    const p=play("bonus2","diestra",["Base 5","+2 Diestra"]);
    expect(powerSourceCues(duel(p,p),"player","dextral")).toEqual([
      {side:"player",kind:"position",position:"diestra"}
    ]);
    expect(powerSourceCues(duel(play("first_round3","diestra",["Base 5","+3 primera carta de la ronda"]),p),"player","dextral")).toEqual([]);
  });

  it("recognizes a confirmed Champion modifier without inventing others", () => {
    const p=play("bonus2","siniestra",["Base 5","+2 Vinira fuera de afinidad"]);
    const cues=powerSourceCues(duel(p,p),"player","vinira");
    expect(cues).toContainEqual({side:"player",kind:"champion"});
    expect(powerSourceCues(duel(p,p),"player","dextral")).not.toContainEqual({side:"player",kind:"champion"});
  });

  it("only flashes post-duel Champion passives that truly activated", () => {
    const player=play("none","diestra",["Base 5"]);
    const opponent=play("none","trono",["Base 5"]);
    const before={
      player:{champion:{id:"athos"},athosDiestraCapacity:2},
      opponent:{champion:{id:"dextral"}}
    } as unknown as GameState;
    const after={
      player:{champion:{id:"athos"},athosDiestraCapacity:3},
      opponent:{champion:{id:"dextral"}}
    } as unknown as GameState;
    expect(postDuelChampionCues(before,after,duel(player,opponent,"player"))).toEqual([
      {side:"player",kind:"champion"}
    ]);
    expect(postDuelChampionCues(before,after,duel(player,opponent,"opponent"))).toEqual([]);
    expect(postDuelChampionCues(null,after,duel(player,opponent,"player"))).toEqual([]);
  });

  it("recognizes an actual Samas draw without asserting it during other results", () => {
    const p=play("none","trono",["Base 5"]);
    const state={player:{champion:{id:"samas"}},opponent:{champion:{id:"dextral"}}} as unknown as GameState;
    expect(postDuelChampionCues(state,state,duel(p,p,"draw"))).toEqual([
      {side:"player",kind:"champion"}
    ]);
    expect(postDuelChampionCues(state,state,duel(p,p,"player"))).toEqual([]);
  });
});
