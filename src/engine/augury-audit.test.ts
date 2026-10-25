import { describe, expect, it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { auguryMatches, resolveAuguries, submitPlayerPlay } from "./game";
import { calculateDuel } from "./rules";
import { createGame, resetRoundPlayer } from "./state";
import type { EnginePlay, GameState, PendingAugury } from "./types";

const fixed=()=>0.314159;

function play(id:string, position:Position):EnginePlay {
  return {card:byId(id),position};
}

function augury(effect:string, position:Position="siniestra"):PendingAugury {
  return {effect,sourceCardId:"test",sourceName:"TEST",sourcePosition:position};
}

function fresh():GameState {
  return createGame("prioresa_luna_llena","athos",fixed,"player");
}

describe("Augurio +3 acierto / +1 fallo regression", () => {
  it("when replying, a correct previous prediction gives +3 to the next card immediately", () => {
    const state=fresh();
    state.player.pendingAuguries=[augury("augury_trono")];

    resolveAuguries(state,state.player,play("mensajero","trono"),state.opponent,false);

    expect(state.player.pendingAuguries).toHaveLength(0);
    expect(state.player.auguryBuff).toBe(3);
    expect(state.player.auguryQueuedBuff).toBe(0);
    expect(state.player.lastAuguryResult).toBe("hit");
    expect(state.player.auguryHitsSinceHeal).toBe(1);
    expect(calculateDuel(state,play("sanadora","siniestra"),play("mensajero","trono")).player).toBe(8);
    expect(state.events.at(-1)?.text).toContain("+3 Poder");
  });

  it("when replying, a missed previous prediction gives +1, but never counts toward healing", () => {
    const state=fresh();
    state.player.life=8;
    state.player.auguryHitsSinceHeal=1;
    state.player.pendingAuguries=[augury("augury_trono")];

    resolveAuguries(state,state.player,play("mensajero","diestra"),state.opponent,false);

    expect(state.player.auguryBuff).toBe(1);
    expect(state.player.lastAuguryResult).toBe("miss");
    expect(state.player.auguryHitsSinceHeal).toBe(1);
    expect(state.player.auguryHeals).toBe(0);
    // Curación fallida (4+3) combines with Augurio's consolation +1.
    expect(calculateDuel(state,play("curacion_fallida","siniestra"),play("mensajero","trono")).player).toBe(8);
    expect(state.events.at(-1)?.text).toContain("+1 Poder");
  });

  it("when opening, a successful prediction cannot buff its own already-committed card", () => {
    const state=fresh();
    state.player.pendingAuguries=[augury("augury_trono")];
    resolveAuguries(state,state.player,play("mensajero","trono"),state.opponent,true);
    expect(state.player.auguryBuff).toBe(0);
    expect(state.player.auguryQueuedBuff).toBe(3);

    state.player.hand=[byId("sanadora"),byId("sanadora")];
    state.opponent.hand=[byId("mensajero"),byId("mensajero"),byId("mensajero")];
    state.initiative="opponent";
    state.pendingOpponentPlay=play("mensajero","trono");

    submitPlayerPlay(state,0,"siniestra",fixed);
    expect(state.lastDuel?.playerPlay.finalPower).toBe(5);
    expect(state.player.auguryBuff).toBe(3);
    expect(state.player.auguryQueuedBuff).toBe(0);
    expect(calculateDuel(state,play("sanadora","diestra"),play("mensajero","siniestra")).player).toBe(8);
  });

  it("when opening, a missed prediction queues +1 for the following card", () => {
    const state=fresh();
    state.player.pendingAuguries=[augury("augury_trono")];
    resolveAuguries(state,state.player,play("mensajero","siniestra"),state.opponent,true);
    expect(state.player.auguryBuff).toBe(0);
    expect(state.player.auguryQueuedBuff).toBe(1);

    state.player.hand=[byId("sanadora"),byId("sanadora")];
    state.opponent.hand=[byId("mensajero"),byId("mensajero"),byId("mensajero")];
    state.initiative="opponent";
    state.pendingOpponentPlay=play("mensajero","trono");

    submitPlayerPlay(state,0,"siniestra",fixed);
    expect(state.lastDuel?.playerPlay.finalPower).toBe(5);
    expect(state.player.auguryBuff).toBe(1);
    expect(state.player.auguryHitsSinceHeal).toBe(0);
    expect(calculateDuel(state,play("sanadora","diestra"),play("mensajero","trono")).player).toBe(6);
  });

  it("stacked predictions add their rewards, but count only hits for Prioresa", () => {
    const state=fresh();
    state.player.pendingAuguries=[
      augury("augury_trono"),
      augury("augury_printed6")
    ];
    const observed=play("mensajero","trono");
    expect(auguryMatches(state.player.pendingAuguries[0],observed,state.opponent)).toBe(true);
    expect(auguryMatches(state.player.pendingAuguries[1],observed,state.opponent)).toBe(false);

    resolveAuguries(state,state.player,observed,state.opponent,false);
    expect(state.player.auguryBuff).toBe(4);
    expect(state.player.auguryHitsSinceHeal).toBe(1);
    expect(state.player.lastAuguryResult).toBe("miss");
    expect(state.player.pendingAuguries).toHaveLength(0);
  });

  it("a reward waiting for the next card survives a round reset", () => {
    const state=fresh();
    state.player.pendingAuguries=[augury("augury_trono")];
    resolveAuguries(state,state.player,play("mensajero","diestra"),state.opponent,true);
    expect(state.player.auguryQueuedBuff).toBe(1);
    resetRoundPlayer(state.player,fixed);
    expect(state.player.auguryQueuedBuff).toBe(1);
    expect(state.player.auguryBuff).toBe(0);
  });
});
