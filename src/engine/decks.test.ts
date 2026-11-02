import { describe, expect, it } from "vitest";
import { redCards, blueCards, saintCards } from "../data";
import { makeMonoDeckDefinition, cardsForDeck, proposedMultifactionRules, validateDeck } from "./decks";
import { createGame, resetRoundPlayer } from "./state";
import { startGame } from "./game";

const pair=(id:string)=>[id,id];
const twoFaction={
  id:"mixed-red-blue",
  name:"Dextral y Corte",
  championId:"dextral",
  cardIds:[
    ...redCards.slice(0,6).flatMap(card=>pair(card.id)),
    ...blueCards.slice(0,6).flatMap(card=>pair(card.id))
  ]
};
const fixed=()=>.4;

describe("24-card decks: 12 distinct cards, exactly 2 copies",()=>{
  it("restores and preserves the original 12x2 monofaction deck",()=>{
    const def=makeMonoDeckDefinition("dextral");
    expect(def.cardIds).toHaveLength(24);
    expect(new Set(def.cardIds).size).toBe(12);
    expect(validateDeck(def).valid).toBe(true);
    expect(cardsForDeck(def).every(card=>card.faction==="red")).toBe(true);
    for(const id of new Set(def.cardIds)) {
      expect(def.cardIds.filter(cardId=>cardId===id)).toHaveLength(2);
    }
    const standard=createGame("dextral","athos",fixed);
    expect(standard.player.deckRecipe).toBeUndefined();
    expect(standard.player.deck.length+standard.player.hand.length).toBe(24);
    expect(standard.opponent.deck.length+standard.opponent.hand.length).toBe(24);
  });

  it("requires 12 distinct selected cards at exactly two copies each",()=>{
    expect(proposedMultifactionRules).toMatchObject({
      deckSize:24,maxCopies:2,distinctCards:12,maxFactions:2
    });
    expect(validateDeck(twoFaction)).toMatchObject({
      valid:true,
      cardsByFaction:{red:12,blue:12}
    });
    expect(cardsForDeck(twoFaction).filter(card=>card.faction==="blue")).toHaveLength(12);
    expect(new Set(twoFaction.cardIds).size).toBe(12);
  });

  it("permits unequal ratios between the two factions",()=>{
    const uneven={...twoFaction,cardIds:[
      ...redCards.slice(0,9).flatMap(card=>pair(card.id)),
      ...blueCards.slice(0,3).flatMap(card=>pair(card.id))
    ]};
    expect(validateDeck(uneven)).toMatchObject({
      valid:true,cardsByFaction:{red:18,blue:6}
    });
  });

  it("rejects a third faction or no cards from the Champion faction",()=>{
    const thirdFaction={...twoFaction,cardIds:[
      ...redCards.slice(0,5).flatMap(card=>pair(card.id)),
      ...blueCards.slice(0,6).flatMap(card=>pair(card.id)),
      ...saintCards.slice(0,1).flatMap(card=>pair(card.id))
    ]};
    expect(validateDeck(thirdFaction).valid).toBe(false);
    const noPrimary={...twoFaction,cardIds:blueCards.flatMap(card=>pair(card.id))};
    expect(validateDeck(noPrimary).valid).toBe(false);
  });

  it("rejects fewer than 12 distinct cards, single copies, triple copies and 13 selections",()=>{
    const fewerSelections={...twoFaction,cardIds:twoFaction.cardIds.slice(0,-2)};
    expect(validateDeck(fewerSelections).valid).toBe(false);
    const oneCopy={...twoFaction,cardIds:twoFaction.cardIds.slice(0,-1)};
    expect(validateDeck(oneCopy).valid).toBe(false);
    const tripleCopy={...twoFaction,cardIds:[
      ...twoFaction.cardIds.slice(0,-1),twoFaction.cardIds[0]
    ]};
    expect(validateDeck(tripleCopy).valid).toBe(false);
    const thirteen={...twoFaction,cardIds:[
      ...twoFaction.cardIds,blueCards[6].id,blueCards[6].id
    ]};
    expect(validateDeck(thirteen).valid).toBe(false);
    expect(validateDeck({...twoFaction,cardIds:[]}).valid).toBe(false);
  });

  it("retains the exact 24-card mixed recipe after reshuffling",()=>{
    const state=startGame("dextral","athos",fixed,"player","normal",{player:twoFaction});
    expect(state.player.deckRecipe).toEqual(twoFaction.cardIds);
    expect(state.player.deck.length+state.player.hand.length).toBe(24);
    expect([...state.player.deck,...state.player.hand].filter(card=>card.faction==="blue")).toHaveLength(12);
    state.player.deck.splice(0);
    resetRoundPlayer(state.player,fixed);
    expect([...state.player.deck,...state.player.hand].filter(card=>card.faction==="blue")).toHaveLength(12);
    expect(state.player.cycles).toBe(1);
  });

  it("rejects a mixed deck whose Champion differs from the selected Champion",()=>{
    expect(()=>createGame("athos","dextral",fixed,"player",{player:twoFaction})).toThrow(/Champion/);
  });
});
