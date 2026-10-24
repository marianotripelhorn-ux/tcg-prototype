import { describe, expect, it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { answerQuiero, submitPlayerPlay } from "./game";
import { capacity, legalPositions } from "./rules";
import { createGame, resetRoundPlayer } from "./state";
import type { EnginePlay } from "./types";

const fixed=()=>0.314159;

function play(id:string,position:Position):EnginePlay {
  return {card:byId(id),position};
}

describe("Daggerlight v2 core-rules audit", () => {
  it("uses 24-card faction decks and deals exactly three cards", () => {
    const state=createGame("dextral","athos",fixed,"player");
    expect(state.player.hand).toHaveLength(3);
    expect(state.player.deck).toHaveLength(21);
    expect(state.player.hand.length+state.player.deck.length).toBe(24);
  });

  it("uses one slot per position by default and Champion capacity overrides it", () => {
    const state=createGame("athos","desartes",fixed,"player");
    expect(capacity(state.player,"siniestra")).toBe(1);
    expect(capacity(state.player,"trono")).toBe(1);
    expect(capacity(state.player,"diestra")).toBe(1);
    expect(legalPositions(state.player).sort()).toEqual(["diestra","siniestra","trono"]);

    const majestad=createGame("dextral","athos",fixed,"player");
    expect(capacity(majestad.player,"diestra")).toBe(2);
  });

  it("the duel winner opens the next duel", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.player.hand=[byId("invocadagas")];
    state.opponent.hand=[];
    state.initiative="opponent";
    state.pendingOpponentPlay=play("mensajero","trono");
    submitPlayerPlay(state,0,"diestra",fixed);
    expect(state.lastDuel?.outcome).toBe("player");
    expect(state.turn).toBe(2);
    expect(state.initiative).toBe("player");
  });

  it("a draw preserves the current opener", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.player.hand=[byId("asesor_real")];
    state.opponent.hand=[byId("mensajero"),byId("mensajero"),byId("mensajero")];
    state.initiative="player";
    submitPlayerPlay(state,0,"trono",fixed);
    expect(state.lastDuel?.outcome).toBe("draw");
    expect(state.turn).toBe(2);
    expect(state.initiative).toBe("player");
  });

  it("accepting Quiero after 0-2 makes the third duel mandatory", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.phase="awaiting_quiero";
    state.turn=2;
    state.duelScore={player:0,opponent:2};
    answerQuiero(state,true,fixed);
    expect(state.turn).toBe(3);
    expect(state.phase).toBe("awaiting_player");
  });

  it("No quiero ends the round, archives played cards, discards unused cards, and alternates the round starter", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.phase="awaiting_quiero";
    state.turn=2;
    state.duelScore={player:0,opponent:2};
    state.roundStarter="player";
    state.initiative="opponent";
    state.player.roundPlays=[
      {...play("invocadagas","diestra"),finalPower:7},
      {...play("mensajero","trono"),finalPower:5}
    ];
    state.opponent.roundPlays=[
      {...play("caballero_tigre","siniestra"),finalPower:6},
      {...play("incendiario","trono"),finalPower:8}
    ];
    state.player.hand=[byId("asesor_real")];

    answerQuiero(state,false,fixed);

    expect(state.round).toBe(2);
    expect(state.roundStarter).toBe("opponent");
    expect(state.player.archives.diestra.some(card=>card.id==="invocadagas")).toBe(true);
    expect(state.player.archives.trono.some(card=>card.id==="mensajero")).toBe(true);
    expect(state.player.discard.some(card=>card.id==="asesor_real")).toBe(true);
    expect(state.duelScore).toEqual({player:0,opponent:0});
  });

  it("rebuilds the 24-card faction deck when fewer than three cards remain", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.player.deck=[byId("mensajero")];
    state.player.hand=[];
    state.player.cycles=0;
    resetRoundPlayer(state.player,fixed);
    expect(state.player.cycles).toBe(1);
    expect(state.player.hand).toHaveLength(3);
    expect(state.player.deck).toHaveLength(21);
  });

  it("Life reaching zero ends the game immediately", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.opponent.life=1;
    state.player.hand=[byId("invocadagas")];
    state.opponent.hand=[];
    state.initiative="opponent";
    state.pendingOpponentPlay=play("mensajero","trono");

    submitPlayerPlay(state,0,"diestra",fixed);

    expect(state.opponent.life).toBe(0);
    expect(state.phase).toBe("finished");
    expect(state.winner).toBe("player");
    expect(state.endReason).toBe("vida");
  });

  it("the third duel closes the round", () => {
    const state=createGame("athos","desartes",fixed,"player");
    state.turn=3;
    state.phase="awaiting_player";
    state.duelScore={player:1,opponent:1};
    state.player.roundPlays=[
      {...play("mensajero","siniestra"),finalPower:5},
      {...play("asesor_real","trono"),finalPower:5}
    ];
    state.opponent.roundPlays=[
      {...play("mensajero","siniestra"),finalPower:5},
      {...play("asesor_real","trono"),finalPower:5}
    ];
    state.player.hand=[byId("invocadagas")];
    state.opponent.hand=[];
    state.initiative="opponent";
    state.pendingOpponentPlay=play("mensajero","diestra");

    submitPlayerPlay(state,0,"diestra",fixed);

    expect(state.round).toBe(2);
    expect(state.turn).toBe(1);
    expect(state.rounds.at(-1)?.reason).toBe("completed");
  });
});
