import { describe, expect, it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { submitPlayerPlay } from "./game";
import { calculateDuel, capacity } from "./rules";
import { createGame } from "./state";
import type { EnginePlay, GameState } from "./types";

const fixed=()=>0.314159;

function play(id:string,position:Position):EnginePlay {
  return {card:byId(id),position};
}

function controlled(
  playerChampion:string,
  opponentChampion:string,
  playerId:string,
  playerPosition:Position,
  opponentId:string,
  opponentPosition:Position
) {
  const state=createGame(playerChampion,opponentChampion,fixed,"player");
  state.phase="awaiting_player";
  state.turn=1;
  state.duelScore={player:0,opponent:0};
  state.initiative="opponent";
  state.player.hand=[byId(playerId)];
  state.opponent.hand=[byId("mensajero"),byId("mensajero"),byId("mensajero")];
  state.player.roundPlays=[];
  state.opponent.roundPlays=[];
  state.player.duelResults=[];
  state.opponent.duelResults=[];
  state.pendingPlayerPlay=null;
  state.pendingOpponentPlay=play(opponentId,opponentPosition);
  submitPlayerPlay(state,0,playerPosition,fixed);
  return state;
}

describe("Daggerlight v2 Champion audit", () => {
  it("Majestad Dextral has two Diestra slots and no old win buff", () => {
    const state=createGame("dextral","athos",fixed,"player");
    expect(capacity(state.player,"diestra")).toBe(2);
    const resolved=controlled("dextral","athos","invocadagas","diestra","mensajero","trono");
    expect(resolved.lastDuel?.outcome).toBe("player");
    expect(resolved.player.nextBuff).toBe(0);
  });

  it("Athos expands Diestra after winning there, capped at three", () => {
    const state=controlled("athos","desartes","invocadagas","diestra","mensajero","trono");
    expect(state.lastDuel?.outcome).toBe("player");
    expect(state.player.athosDiestraCapacity).toBe(2);
    expect(capacity(state.player,"diestra")).toBe(2);
    state.player.athosDiestraCapacity=3;
    expect(capacity(state.player,"diestra")).toBe(3);
  });

  it("Corte Sinistral prepares -1 after its first loss of the round", () => {
    const state=controlled("sinistral","athos","prodigio","trono","mensajero","trono");
    expect(state.lastDuel?.outcome).toBe("opponent");
    expect(state.player.bluePassiveUsed).toBe(true);
    expect(state.opponent.incomingDebuff).toBe(1);
  });

  it("Vinira enables the first off-affinity positional ability and gives +1", () => {
    const state=createGame("vinira","desartes",fixed,"player");
    state.player.roundPlays=[];
    state.opponent.roundPlays=[];
    const first=calculateDuel(state,play("invocadagas","trono"),play("mensajero","trono"));
    expect(first.playerAffinity).toBe(true);
    expect(first.player).toBe(8);

    const resolved=controlled("vinira","desartes","invocadagas","trono","mensajero","trono");
    expect(resolved.player.viniraUsed).toBe(true);
    const second=calculateDuel(resolved,play("invocadagas","trono"),play("mensajero","trono"));
    expect(second.playerAffinity).toBe(false);
    expect(second.player).toBe(5);
  });

  it("Señor de los Archivos grants +2 next round after rival used all three positions", () => {
    const state=createGame("empireos","athos",fixed,"player");
    state.turn=3;
    state.phase="awaiting_player";
    state.initiative="opponent";
    state.duelScore={player:1,opponent:1};
    state.player.roundPlays=[
      {...play("gusano_blanco","siniestra"),finalPower:6},
      {...play("bibliotecario","diestra"),finalPower:4}
    ];
    state.opponent.roundPlays=[
      {...play("invocadagas","siniestra"),finalPower:5},
      {...play("incendiario","trono"),finalPower:5}
    ];
    state.player.hand=[byId("heraldo")];
    state.opponent.hand=[];
    state.pendingOpponentPlay=play("mensajero","diestra");

    submitPlayerPlay(state,0,"trono",fixed);

    expect(state.round).toBe(2);
    expect(state.player.empireanBuff).toBe(2);
  });

  it("Desartes doubles capacity in every tied most-populated Archive position", () => {
    const state=createGame("desartes","athos",fixed,"player");
    state.player.archives.siniestra=[byId("mensajero"),byId("mensajero")];
    state.player.archives.trono=[byId("mensajero")];
    state.player.archives.diestra=[byId("mensajero"),byId("mensajero")];
    expect(capacity(state.player,"siniestra")).toBe(2);
    expect(capacity(state.player,"diestra")).toBe(2);
    expect(capacity(state.player,"trono")).toBe(1);
  });

  it("Santo Simétrico turns a one-Power loss into a tie once per round", () => {
    const state=controlled("santo_simetrico","athos","pendulo","trono","mensajero","trono");
    expect(state.lastDuel?.outcome).toBe("draw");
    expect(state.lastDuel?.playerPlay.finalPower).toBe(5);
    expect(state.player.saintPassiveUsed).toBe(true);
    expect(state.player.life).toBe(9);
  });

  it("Samas gives +2 to the next card after a draw", () => {
    const state=controlled("samas","athos","asesor_real","trono","mensajero","trono");
    expect(state.lastDuel?.outcome).toBe("draw");
    expect(state.player.nextBuff).toBe(2);
    expect(state.player.nextBuffNotes).toContain("+2 Samas");
  });
  it("Prioresa de la Luna Llena heals after every third successful Augury, up to two times", () => {
    const state=createGame("prioresa_luna_llena","athos",fixed,"player");
    state.player.life=8;
    state.player.auguryHitsSinceHeal=2;
    state.player.auguryHeals=0;
    state.player.hand=[byId("luna_creciente")];
    state.opponent.hand=[byId("mensajero")];
    state.player.roundPlays=[];
    state.opponent.roundPlays=[];
    state.initiative="player";
    state.phase="awaiting_player";

    submitPlayerPlay(state,0,"siniestra",fixed);

    expect(state.lastDuel?.playerPlay.finalPower).toBe(5);
    expect(state.player.lastAuguryResult).toBe("hit");
    expect(state.player.life).toBe(9);
    expect(state.player.auguryHeals).toBe(1);
    expect(state.player.auguryHitsSinceHeal).toBe(0);

    state.player.life=8;
    state.player.auguryHeals=2;
    state.player.auguryHitsSinceHeal=2;
    state.player.pendingAuguries=[{
      effect:"augury_trono",
      sourceCardId:"iniciada",
      sourceName:"INICIADA",
      sourcePosition:"siniestra"
    }];
    state.player.hand=[byId("sanadora")];
    state.opponent.hand=[byId("mensajero")];
    state.pendingOpponentPlay={card:byId("mensajero"),position:"trono"};
    state.initiative="opponent";
    state.phase="awaiting_player";

    submitPlayerPlay(state,0,"siniestra",fixed);

    expect(state.player.auguryHeals).toBe(2);
    expect(state.player.life).toBeLessThanOrEqual(8);
  });

});
