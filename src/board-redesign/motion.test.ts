import { describe,expect,it } from "vitest";
import { startGame,cloneGame,submitPlayerPlay,submitPlayerSpecial } from "../engine/game";
import { disableManifestations } from "./disableManifestations";
import { visibleHand,visibleRoundPlays,type BoardMotionSequence } from "./motion";
import { cardsByFaction } from "../data";

const rng=()=>.41;
function startDisabled(){return disableManifestations(startGame("dextral","sinistral",rng,"player","normal",undefined,false));}

describe("Board motion v1: optional Manifestations-off mode",()=>{
  it("does not alter the default engine's ability to enable Manifestations",()=>{
    const original=startGame("dextral","sinistral",rng,"player","normal");
    expect(original.manifestationsEnabled).toBe(true);
  });
  it("normalizes Manifestations in resumed game states without removing normal cards",()=>{
    const state=startGame("dextral","sinistral",rng,"player","normal");
    const kept=state.player.hand[0];
    state.player.specialHand=["dagger","symmetry"];
    state.opponent.manifestations=[{kind:"shield",position:"siniestra",createdRound:1}];
    state.player.archives.siniestra=[
      kept,{...kept,id:"archive_dagger",specialArchiveKind:"dagger"}
    ];
    const next=disableManifestations(cloneGame(state));
    expect(next.manifestationsEnabled).toBe(false);
    expect(next.player.specialHand).toHaveLength(0);
    expect(next.opponent.manifestations).toHaveLength(0);
    expect(next.player.archives.siniestra).toEqual([kept]);
    expect(state.player.specialHand).toHaveLength(2);
  });
  it("blocks Manifestation actions in disabled matches",()=>{
    const state=startDisabled();
    state.player.specialHand.push("relic");
    expect(()=>submitPlayerSpecial(state,"relic","siniestra")).toThrow("Manifestaciones desactivadas");
  });
  it("does not create tokens when playing a Manifestation creator",()=>{
    const state=startDisabled();
    const creator=cardsByFaction.red.find(c=>c.id==="caballero_tigre");
    expect(creator).toBeDefined();
    state.player.hand=[creator!,...state.player.hand.slice(1)];
    submitPlayerPlay(state,0,"siniestra",rng);
    expect(state.player.specialHand).toHaveLength(0);
    expect(state.opponent.specialHand).toHaveLength(0);
    expect(state.player.manifestations).toHaveLength(0);
    expect(state.opponent.manifestations).toHaveLength(0);
  });
});

describe("Board motion v1: a display snapshot never changes engine state",()=>{
  it("retains completed cards and adds duel cards for both sides, independent of positions",()=>{
    const game=startDisabled();
    const before=JSON.stringify(game);
    const duel={
      turn:1 as const,outcome:"player" as const,
      playerPlay:{card:game.player.hand[0],position:"siniestra" as const,finalPower:6},
      opponentPlay:{card:game.opponent.hand[0],position:"diestra" as const,finalPower:4}
    };
    const motion:BoardMotionSequence={id:1,phase:"flight",before:game,duel,roundEnded:false,handIndex:0,origin:null};
    expect(visibleRoundPlays(motion,"player")?.[0].position).toBe("siniestra");
    expect(visibleRoundPlays(motion,"opponent")?.[0].position).toBe("diestra");
    expect(visibleHand(motion,[]).length).toBe(game.player.hand.length-1);
    expect(JSON.stringify(game)).toBe(before);
  });
  it("keeps all prior round plays during a No quiero Archive transition",()=>{
    const state=startDisabled();
    const motion:BoardMotionSequence={id:3,phase:"archive",before:state,duel:null,roundEnded:true,handIndex:null,origin:null};
    expect(visibleRoundPlays(motion,"player")).toEqual(state.player.roundPlays);
    expect(visibleHand(motion,[])).toEqual(state.player.hand);
  });
});
