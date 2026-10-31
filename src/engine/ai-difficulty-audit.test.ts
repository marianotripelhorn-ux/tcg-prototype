import { describe, expect, it } from "vitest";
import { byId } from "../data";
import { chooseAIPlay } from "./ai";
import { startGame } from "./game";
import { createGame } from "./state";

const fixed=()=>.42;

describe("Daggerlight configurable AI", () => {
  it("preserves standard AI by default", () => {
    const state=startGame("dextral","athos",fixed,"player");
    expect(state.aiDifficulty).toBe("normal");
    expect(state.phase).toBe("awaiting_player");
  });

  it("accepts an explicit easy or hard setting", () => {
    expect(startGame("dextral","athos",fixed,"player","easy").aiDifficulty).toBe("easy");
    expect(startGame("dextral","athos",fixed,"player","hard").aiDifficulty).toBe("hard");
  });

  it("always makes a legal move in easy mode", () => {
    const state=createGame("dextral","athos",fixed,"player");
    state.aiDifficulty="easy";
    state.opponent.hand=[byId("mensajero"),byId("invocadagas")];
    const result=chooseAIPlay(state,null,true,()=>0);
    expect(state.opponent.hand[result.handIndex!]).toBe(result.card);
    expect(["siniestra","trono","diestra"]).toContain(result.position);
  });

  it("hard AI evaluates the immediate +3 of a visible Augurio without hidden information", () => {
    const state=createGame("prioresa_luna_llena","dextral",fixed,"player");
    state.opponent.hand=[byId("invocadagas")];
    state.aiDifficulty="hard";
    const response=chooseAIPlay(state,{card:byId("luna_creciente"),position:"trono"},false,()=>.5);
    expect(response.position).toBe("diestra");
    expect(response.card.id).toBe("invocadagas");
    // Against the open Trono Augurio, responding in Diestra both avoids
    // the +3 bonus and activates Invocadagas.
  });
});
