import { describe, expect, it } from "vitest";
import { archiveCountChange, completedRoundReceipt } from "./roundChoreography";
import type { GameState, RoundSummary } from "../engine/types";
import type { BoardMotionSequence } from "./motion";
import type { Position } from "../types";

const positions:Position[]=["siniestra","trono","diestra"];

function state(round:number,counts:{player:number[];opponent:number[]},rounds:RoundSummary[]=[]):GameState {
  const archives=(numbers:number[])=>Object.fromEntries(
    positions.map((position,i)=>[position,Array(numbers[i]).fill({id:"test-card"})])
  );
  return {round,rounds,
    player:{archives:archives(counts.player)},
    opponent:{archives:archives(counts.opponent)}
  } as unknown as GameState;
}

describe("round and Archive presentation stays grounded in engine state",()=>{
  const before=state(3,{player:[2,1,0],opponent:[3,0,1]});
  const summary:RoundSummary={
    round:3,score:{player:2,opponent:0},reason:"opponent_no_quiero",
    playerLife:6,opponentLife:4,starter:"opponent"
  };
  const after=state(4,{player:[0,3,1],opponent:[4,1,1]},[summary]);
  const motion={id:8,phase:"round",before,roundEnded:true,
    duel:null,handIndex:null,origin:null} as BoardMotionSequence;

  it("uses the last actual completed round summary, not provisional scores",()=>{
    expect(completedRoundReceipt(motion,after)).toEqual(summary);
  });
  it("refuses to manufacture a round ceremony if no engine round ended",()=>{
    expect(completedRoundReceipt({...motion,roundEnded:false},after)).toBeNull();
    expect(completedRoundReceipt(motion,state(3,{player:[0,0,0],opponent:[0,0,0]},[summary]))).toBeNull();
    const missing=state(4,{player:[0,0,0],opponent:[0,0,0]});
    expect(completedRoundReceipt(motion,missing)).toBeNull();
    const older=state(4,{player:[0,0,0],opponent:[0,0,0]},[{...summary,round:2}]);
    expect(completedRoundReceipt(motion,older)).toBeNull();
  });
  it("signals only actual Archive changes, including clearing by a card",()=>{
    expect(archiveCountChange(before,after,"player","siniestra")).toBe(-2);
    expect(archiveCountChange(before,after,"player","trono")).toBe(2);
    expect(archiveCountChange(before,after,"player","diestra")).toBe(1);
    expect(archiveCountChange(before,after,"opponent","siniestra")).toBe(1);
    expect(archiveCountChange(before,after,"opponent","diestra")).toBe(0);
  });
});
