import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { startGame } from "../engine/game";
import { HybridSidebar, HybridRightRail, HybridCommandRail, HybridEngraving } from "./HybridBoardHardware";

const newGame=()=>startGame("dextral","sinistral",Math.random,"player","normal");

describe("Hybrid board is a view of the authoritative engine state",()=>{
  it("starts with the user Champion expanded, rival compact, and shows real abilities",()=>{
    const game=newGame();
    const html=renderToStaticMarkup(createElement(HybridSidebar,{
      player:game.player,opponent:game.opponent,playerName:"PLAYTEST"
    }));
    expect(html).toContain("hybrid-champion-panel opponent is-compact");
    expect(html).toContain("hybrid-champion-panel player is-expanded");
    expect(html).toContain("PLAYTEST");
    expect(html).toContain(game.player.champion.name);
    expect(html).toContain(game.player.champion.text);
    expect(html).toContain(game.opponent.champion.name);
  });

  it("renders life, score and real remaining deck count, not artwork-only numbers",()=>{
    const game=newGame();
    const html=renderToStaticMarkup(createElement(HybridRightRail,{
      playerLife:7,opponentLife:9,playerHealed:0,opponentHealed:0,
      score:{opponent:1,player:0},
      deckRemaining:game.player.deck.length,discardCount:game.player.discard.length
    }));
    expect(html).toContain("Vida");
    expect(html).toContain("hybrid-life-number");
    expect(html).toContain(">7</span>");
    expect(html).toContain(">9</span>");
    expect(html).toContain("1–0");
    expect(html).toContain("Mazo:");
    expect(html).toContain("branding/logo.svg");
  });

  it("reads the six Archives directly from the real game state",()=>{
    const game=newGame();
    const sample=game.player.hand[0];
    game.player.archives.siniestra.push(sample);
    game.opponent.archives.diestra.push(game.opponent.hand[0]);
    const html=renderToStaticMarkup(createElement(HybridCommandRail,{
      game,pendingOpponent:null,selectedCard:null,latestEvent:"",duelResolving:false,
      onChooseQuiero:()=>{}
    }));
    expect(html).toContain("ARCHIVOS POR POSICIÓN");
    expect(html).toContain("SINIESTRA");
    expect(html).toContain("TRONO");
    expect(html).toContain("DIESTRA");
    expect(html).toContain("Tu turno");
  });

  it("uses a vector engraved overlay with the Vite public base",()=>{
    const html=renderToStaticMarkup(createElement(HybridEngraving));
    expect(html).toContain("hybrid-engraving");
    expect(html).toContain("board/hybrid-engraving.svg");
    expect(html).toContain("aria-hidden");
  });

  it("does not mutate engine state as a side effect of rendering the hardware",()=>{
    const game=newGame();
    const before=JSON.stringify(game);
    renderToStaticMarkup(createElement(HybridSidebar,{
      player:game.player,opponent:game.opponent,playerName:"TEST"
    }));
    renderToStaticMarkup(createElement(HybridCommandRail,{
      game,pendingOpponent:null,selectedCard:null,latestEvent:"",duelResolving:false,
      onChooseQuiero:()=>{}
    }));
    expect(JSON.stringify(game)).toBe(before);
  });
});
