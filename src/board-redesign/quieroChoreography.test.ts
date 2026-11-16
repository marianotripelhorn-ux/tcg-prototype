import { describe,expect,it } from "vitest";
import type { GameState } from "../engine/types";
import { rivalAcceptedQuiero, shouldOfferQuiero } from "./quieroChoreography";

function state(
  phase:GameState["phase"], score:{player:number;opponent:number},
  turn:number,round=2,events:{kind:string;text:string}[]=[],mode:"ai"|"pvp"="ai"
):GameState {
  return {phase,duelScore:score,turn,round,mode,events} as unknown as GameState;
}

describe("Quiero choreography does not invent or modify match decisions",()=>{
  it("presents the human choice only when the actual AI match is 0–2 and awaiting it",()=>{
    const lost=state("awaiting_quiero",{player:0,opponent:2},2);
    expect(shouldOfferQuiero(lost)).toBe(true);
    expect(shouldOfferQuiero(state("awaiting_player",{player:0,opponent:2},2))).toBe(false);
    expect(shouldOfferQuiero(state("awaiting_quiero",{player:2,opponent:0},2))).toBe(false);
    expect(shouldOfferQuiero(state("awaiting_quiero",{player:0,opponent:2},2,2,[],"pvp"))).toBe(false);
  });

  it("requires a fresh authoritative AI Quiero event and third duel, not an old event",()=>{
    const before=state("awaiting_player",{player:1,opponent:0},2,2,[
      {kind:"duel",text:"Duelo 1."}
    ]);
    const yes=state("awaiting_player",{player:2,opponent:0},3,2,[
      ...before.events,{kind:"decision",text:"IA: Quiero."}
    ]);
    expect(rivalAcceptedQuiero(before,yes)).toBe(true);
    expect(rivalAcceptedQuiero(yes,yes)).toBe(false);
    expect(rivalAcceptedQuiero(before,{...yes,round:3})).toBe(false);
    expect(rivalAcceptedQuiero(before,{...yes,turn:1})).toBe(false);
    expect(rivalAcceptedQuiero(before,{...yes,duelScore:{player:1,opponent:1}})).toBe(false);
    expect(rivalAcceptedQuiero(before,{...yes,events:[
      ...before.events,{kind:"decision",text:"IA: No quiero."}
    ]})).toBe(false);
    expect(rivalAcceptedQuiero(before,{...yes,phase:"finished"})).toBe(false);
  });
});
