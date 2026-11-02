import { describe, expect, it } from "vitest";
import { redCards, blueCards } from "../data";
import { makeMonoDeckDefinition, cardsForDeck, validateDeck } from "./decks";
import { createGame, resetRoundPlayer } from "./state";
import { startGame } from "./game";

const twoFaction={
  id:"mixed-red-blue",
  name:"Dextral y Corte",
  championId:"dextral",
  cardIds:[
    ...redCards.slice(0,6).flatMap(x=>[x.id,x.id]),
    ...blueCards.slice(0,6).flatMap(x=>[x.id,x.id])
  ]
};
const fixed=()=>.4;

describe("Experimental multifaction decks",()=>{
  it("keeps the standard monofaction deck intact",()=>{
    const def=makeMonoDeckDefinition("dextral");
    expect(def.cardIds).toHaveLength(24);
    expect(validateDeck(def).valid).toBe(true);
    expect(cardsForDeck(def).every(card=>card.faction==="red")).toBe(true);
    const standard=createGame("dextral","athos",fixed);
    expect(standard.player.deckRecipe).toBeUndefined();
    expect(standard.player.deck.length+standard.player.hand.length).toBe(24);
  });

  it("validates a 24-card 12/12 two-faction recipe with up to two copies",()=>{
    expect(validateDeck(twoFaction)).toMatchObject({
      valid:true,
      cardsByFaction:{red:12,blue:12}
    });
    expect(cardsForDeck(twoFaction).filter(c=>c.faction==="blue")).toHaveLength(12);
  });

  it("rejects extra factions, missing primary, oversized and duplicate cards",()=>{
    const tooMany={...twoFaction,cardIds:[
      ...twoFaction.cardIds.slice(0,22),"santo_bifronte","santo_bifronte"
    ]};
    expect(validateDeck(tooMany).valid).toBe(false);
    const missingPrimary={...twoFaction,cardIds:blueCards.flatMap(c=>[c.id,c.id])};
    expect(validateDeck(missingPrimary).valid).toBe(false);
    const tooManyCopies={...twoFaction,cardIds:[...twoFaction.cardIds.slice(0,22),"protector","protector"]};
    expect(validateDeck(tooManyCopies).valid).toBe(false);
    expect(validateDeck({...twoFaction,cardIds:twoFaction.cardIds.slice(1)}).valid).toBe(false);
  });

  it("lets the gameplay engine use the mixed list and retain it across deck recycle",()=>{
    const state=startGame("dextral","athos",fixed,"player","normal",{player:twoFaction});
    expect(state.player.deckRecipe).toEqual(twoFaction.cardIds);
    expect(state.player.deck.length+state.player.hand.length).toBe(24);
    expect([...state.player.deck,...state.player.hand].filter(c=>c.faction==="blue")).toHaveLength(12);
    state.player.deck.splice(0);
    resetRoundPlayer(state.player,fixed);
    expect([...state.player.deck,...state.player.hand].filter(c=>c.faction==="blue")).toHaveLength(12);
    expect(state.player.cycles).toBe(1);
  });

  it("rejects a mixed deck whose Champion differs from the selected Champion",()=>{
    expect(()=>createGame("athos","dextral",fixed,"player",{player:twoFaction})).toThrow(/Champion/);
  });
});
