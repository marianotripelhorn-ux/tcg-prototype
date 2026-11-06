import { describe, it, expect } from "vitest";
import { startPvpGame, submitHumanPlay, submitHumanQuiero, nextHumanSide, nextHumanQuieroSide } from "./game";
import { legalPositions } from "./rules";
import type { GameState, Side } from "./types";

function play(state:GameState){
  const first=nextHumanSide(state);
  expect(first).not.toBeNull();
  const opening=first==="player"?state.player:state.opponent;
  submitHumanPlay(state,first!,0,legalPositions(opening)[0]);
  expect(nextHumanSide(state)).not.toBe(first);
  const second=nextHumanSide(state)!;
  const answering=second==="player"?state.player:state.opponent;
  submitHumanPlay(state,second,0,legalPositions(answering)[0]);
}

describe("PvP engine",()=>{
  it("hides the AI path, opens with either seat and enforces turns",()=>{
    const state=startPvpGame("dextral","athos",()=>.3,"opponent");
    expect(state.mode).toBe("pvp");
    expect(nextHumanSide(state)).toBe("opponent");
    expect(state.pendingOpponentPlay).toBeNull();
    expect(()=>submitHumanPlay(state,"player",0,"siniestra")).toThrow();
    submitHumanPlay(state,"opponent",0,legalPositions(state.opponent)[0]);
    expect(state.pendingOpponentPlay?.card).toBeDefined();
    expect(nextHumanSide(state)).toBe("player");
    expect(()=>submitHumanPlay(state,"opponent",0,"trono")).toThrow();
    submitHumanPlay(state,"player",0,legalPositions(state.player)[0]);
    expect(state.lastDuel?.turn).toBe(1);
    expect(state.player.roundPlays).toHaveLength(1);
    expect(state.opponent.roundPlays).toHaveLength(1);
  });
  it("progresses round and never invokes AI decisions",()=>{
    const state=startPvpGame("samas","sinistral",()=>.2,"player");
    for(let i=0;i<12 && state.round===1 && state.phase!=="finished";i++){
      if(state.phase==="awaiting_quiero"){
        const side=nextHumanQuieroSide(state);
        expect(side).not.toBeNull();
        expect(()=>submitHumanQuiero(state,side==="player"?"opponent":"player",false)).toThrow();
        submitHumanQuiero(state,side!,false);
        continue;
      }
      play(state);
    }
    expect(state.round).toBeGreaterThan(1);
    expect(state.events.some(e=>e.text.startsWith("IA:"))).toBe(false);
  });
});
