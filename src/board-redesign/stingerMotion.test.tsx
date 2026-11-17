import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {DuelResultStinger,NewRoundStinger} from "./stingerMotion";
import {visibleHand,visibleRoundPlays} from "./motion";
import type {BoardMotionSequence} from "./motion";
import type {CardDefinition} from "../types";
import type {DuelSummary,GameState} from "../engine/types";

const card=(id:string):CardDefinition=>({id,name:id,power:5} as CardDefinition);
const before={
  round:2,
  player:{hand:[card("ONE"),card("TWO")],roundPlays:[{card:card("PLAYED"),position:"trono"}]},
  opponent:{roundPlays:[{card:card("RIVAL"),position:"trono"}]}
} as unknown as GameState;
const afterHand=[card("NEW-ONE"),card("NEW-TWO"),card("NEW-THREE")];
const duel={
  playerPlay:{card:card("ONE"),finalPower:13,position:"trono"},
  opponentPlay:{card:card("RIVAL"),finalPower:9,position:"diestra"},
  outcome:"player",turn:2
} as DuelSummary;
const motion=(phase:BoardMotionSequence["phase"]):BoardMotionSequence=>({
  id:5,phase,before,duel,roundEnded:true,handIndex:0,origin:null
});

describe("grouped motion stays tied to the actual engine result",()=>{
  it("puts both settled Poder values and outcome in one notched ribbon container",()=>{
    const html=renderToStaticMarkup(<DuelResultStinger duel={duel}/>);
    expect(html).toContain('class="dl-duel-stinger"');
    expect(html).toContain('data-player-power="13"');
    expect(html).toContain('data-opponent-power="9"');
    expect(html).toContain('data-outcome="player"');
    expect(html).toContain("VICTORIA");
    expect(html).toContain("TU PODER");
    expect(html).toContain("PODER RIVAL");
    expect((html.match(/dl-duel-stinger-contents/g)||[]).length).toBe(1);
  });
  it("renders the real next round number inside the single moving black surface",()=>{
    const html=renderToStaticMarkup(<NewRoundStinger round={3} sequenceId={5}
      reducedMotion={false} onCovered={()=>{}} onComplete={()=>{}}/>);
    expect(html).toContain("RONDA 3");
    expect(html).toContain('class="dl-new-round-ink"');
    expect((html.match(/dl-new-round-number/g)||[]).length).toBe(1);
  });
  it("holds the old hand and played board until the cover callback, then uses the new state",()=>{
    expect(visibleHand(motion("round-wipe"),afterHand).map(c=>c.id)).toEqual(["TWO"]);
    expect(visibleRoundPlays(motion("round-wipe"),"player")).toHaveLength(2);
    expect(visibleHand(motion("round-wipe-reveal"),afterHand)).toBe(afterHand);
    expect(visibleRoundPlays(motion("round-wipe-reveal"),"player")).toBeNull();
    expect(visibleHand(null,afterHand)).toBe(afterHand);
  });
});
