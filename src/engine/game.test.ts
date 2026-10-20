import { describe, expect, it } from "vitest";
import { byId } from "../data";
import { answerQuiero, startGame, submitPlayerPlay } from "./game";

const fixed = () => 0.314159;

describe("Daggerlight UI v2 engine lifecycle", () => {
  it("deals three cards from a 24-card faction deck", () => {
    const game=startGame("dextral","athos",fixed,"player");
    expect(game.player.hand).toHaveLength(3);
    expect(game.opponent.hand).toHaveLength(3);
    expect(game.player.deck).toHaveLength(21);
    expect(game.opponent.deck).toHaveLength(21);
    expect(game.turn).toBe(1);
  });

  it("stages the AI opening card when the opponent has initiative", () => {
    const game=startGame("dextral","athos",fixed,"opponent");
    expect(game.pendingOpponentPlay).not.toBeNull();
    expect(game.opponent.hand).toHaveLength(2);
    expect(game.phase).toBe("awaiting_player");
  });

  it("resolves a full duel after a legal player play", () => {
    const game=startGame("dextral","athos",fixed,"player");
    submitPlayerPlay(game,0,"siniestra",fixed);
    expect(game.player.roundPlays).toHaveLength(1);
    expect(game.opponent.roundPlays).toHaveLength(1);
    expect(game.lastDuel).not.toBeNull();
    expect(game.turn).toBe(2);
  });

  it("moves from Quiero to the mandatory third duel", () => {
    const game=startGame("dextral","athos",fixed,"player");
    game.phase="awaiting_quiero";
    game.turn=2;
    game.duelScore={player:0,opponent:2};
    answerQuiero(game,true,fixed);
    expect(game.turn).toBe(3);
    expect(game.phase).toBe("awaiting_player");
  });

  it("carries Señor de los Archivos +2 through the round reset", () => {
    const game=startGame("empireos","athos",fixed,"player");
    game.turn=3;
    game.initiative="player";
    game.phase="awaiting_player";
    game.duelScore={player:1,opponent:1};

    game.player.roundPlays=[
      {card:byId("gusano_blanco"),position:"siniestra",finalPower:6},
      {card:byId("bibliotecario"),position:"trono",finalPower:4}
    ];
    game.opponent.roundPlays=[
      {card:byId("invocadagas"),position:"siniestra",finalPower:5},
      {card:byId("incendiario"),position:"trono",finalPower:5}
    ];

    game.player.hand=[byId("heraldo")];
    game.opponent.hand=[byId("mensajero")];

    submitPlayerPlay(game,0,"diestra",fixed);

    expect(game.round).toBe(2);
    expect(game.player.empireanBuff).toBe(2);
    expect(game.player.hand).toHaveLength(3);
  });
});
