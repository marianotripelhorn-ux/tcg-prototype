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

  it("hard mode can dodge a publicly announced Augurio without inspecting player hand", () => {
    const state=createGame("prioresa_luna_llena","dextral",fixed,"player");
    state.opponent.hand=[byId("invocadagas")];
    state.player.pendingAuguries=[{
      effect:"augury_same_position",
      sourceCardId:"luna_creciente",
      sourceName:"LUNA CRECIENTE",
      sourcePosition:"diestra"
    }];
    state.aiDifficulty="normal";
    const standard=chooseAIPlay(state,null,true,()=>.5);
    expect(standard.position).toBe("diestra");
    state.aiDifficulty="hard";
    const hard=chooseAIPlay(state,null,true,()=>.5);
    expect(hard.position).not.toBe("diestra");
  });
});
