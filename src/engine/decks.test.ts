import { describe, expect, it } from "vitest";
import { redCards, blueCards, saintCards } from "../data";
import { makeMonoDeckDefinition, cardsForDeck, proposedMultifactionRules, validateDeck } from "./decks";
import { createGame, resetRoundPlayer } from "./state";
import { startGame } from "./game";

const triple=(id:string)=>[id,id,id];
const twoFaction={
  id:"mixed-red-blue",
  name:"Dextral y Corte",
  championId:"dextral",
  cardIds:[
    ...redCards.slice(0,6).flatMap(card=>triple(card.id)),
    ...blueCards.slice(0,6).flatMap(card=>triple(card.id))
  ]
};
const fixed=()=>.4;

describe("36-card decks: 12 distinct cards with 3 copies",()=>{
  it("preserves the 12-card monofaction catalog, now with 3 copies of each",()=>{
    const def=makeMonoDeckDefinition("dextral");
    expect(def.cardIds).toHaveLength(36);
    expect(new Set(def.cardIds).size).toBe(12);
    expect(validateDeck(def).valid).toBe(true);
    expect(cardsForDeck(def).every(card=>card.faction==="red")).toBe(true);
    for(const id of new Set(def.cardIds)) {
      expect(def.cardIds.filter(cardId=>cardId===id)).toHaveLength(3);
    }
    const standard=createGame("dextral","athos",fixed);
    expect(standard.player.deckRecipe).toBeUndefined();
    expect(standard.player.deck.length+standard.player.hand.length).toBe(36);
  });

  it("validates a mixed 6/6 split with 12 different cards and 3 copies each",()=>{
    expect(proposedMultifactionRules).toMatchObject({
      deckSize:36,maxCopies:3,distinctCards:12,maxFactions:2
    });
    expect(validateDeck(twoFaction)).toMatchObject({
      valid:true,
      cardsByFaction:{red:18,blue:18}
    });
    expect(cardsForDeck(twoFaction).filter(card=>card.faction==="blue")).toHaveLength(18);
  });

  it("does not require a 6/6 split: any 12 distinct cards from up to two factions is valid",()=>{
    const uneven={...twoFaction,cardIds:[
      ...redCards.slice(0,9).flatMap(card=>triple(card.id)),
      ...blueCards.slice(0,3).flatMap(card=>triple(card.id))
    ]};
    expect(validateDeck(uneven)).toMatchObject({
      valid:true,cardsByFaction:{red:27,blue:9}
    });
  });

  it("rejects third faction, missing Champion faction, fewer than 12 choices and four copies",()=>{
    const thirdFaction={...twoFaction,cardIds:[
      ...redCards.slice(0,5).flatMap(card=>triple(card.id)),
      ...blueCards.slice(0,6).flatMap(card=>triple(card.id)),
      ...saintCards.slice(0,1).flatMap(card=>triple(card.id))
    ]};
    expect(validateDeck(thirdFaction).valid).toBe(false);
    const noPrimary={...twoFaction,cardIds:blueCards.flatMap(card=>triple(card.id))};
    expect(validateDeck(noPrimary).valid).toBe(false);
    const tooFew={...twoFaction,cardIds:twoFaction.cardIds.slice(0,-3)};
    expect(validateDeck(tooFew).valid).toBe(false);
    const fourCopies={...twoFaction,cardIds:[
      ...twoFaction.cardIds.slice(0,-1),twoFaction.cardIds[0]
    ]};
    expect(validateDeck(fourCopies).valid).toBe(false);
    const empty={...twoFaction,cardIds:[]};
    expect(validateDeck(empty).valid).toBe(false);
  });

  it("retains the 36-card mixed recipe after a reshuffle and game save",()=>{
    const state=startGame("dextral","athos",fixed,"player","normal",{player:twoFaction});
    expect(state.player.deckRecipe).toEqual(twoFaction.cardIds);
    expect(state.player.deck.length+state.player.hand.length).toBe(36);
    expect([...state.player.deck,...state.player.hand].filter(card=>card.faction==="blue")).toHaveLength(18);
    state.player.deck.splice(0);
    resetRoundPlayer(state.player,fixed);
    expect([...state.player.deck,...state.player.hand].filter(card=>card.faction==="blue")).toHaveLength(18);
    expect(state.player.cycles).toBe(1);
  });

  it("rejects a mixed deck whose Champion differs from selected Champion",()=>{
    expect(()=>createGame("athos","dextral",fixed,"player",{player:twoFaction})).toThrow(/Champion/);
  });
});
