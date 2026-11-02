import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startGame } from "./engine/game";
import { redCards,blueCards } from "./data";
import {
  appendMatchHistory, clearSavedMatch, completedMatch, newSavedMatch,
  readMatchHistory, readSavedMatch, SAVE_KEY, summarizeHistory, writeSavedMatch
} from "./persistence";

function fakeStorage():Storage {
  const map=new Map<string,string>();
  return {
    get length(){return map.size;},
    clear:()=>map.clear(),
    getItem:(key:string)=>map.get(key)??null,
    key:(n:number)=>[...map.keys()][n]??null,
    removeItem:(key:string)=>{map.delete(key);},
    setItem:(key:string,value:string)=>{map.set(key,value);}
  };
}
describe("Daggerlight local match persistence",()=>{
  let store:Storage;
  beforeEach(()=>{store=fakeStorage();vi.stubGlobal("window",{localStorage:store});});
  afterEach(()=>vi.unstubAllGlobals());

  it("saves a complete live game and reads it back with the same pending opponent play",()=>{
    const game=startGame("vinira","athos",()=>.3,"opponent","hard");
    const saved=newSavedMatch(game,"athos");
    expect(writeSavedMatch(saved)).toBe(true);
    const restored=readSavedMatch();
    expect(restored?.id).toBe(saved.id);
    expect(restored?.game.aiDifficulty).toBe("hard");
    expect(restored?.game.player.hand.map(c=>c.id)).toEqual(game.player.hand.map(c=>c.id));
    expect(restored?.game.pendingOpponentPlay?.card.id).toBe(game.pendingOpponentPlay?.card.id);
    expect(restored?.game.phase).toBe("awaiting_player");
  });

  it("refuses malformed or old ruleset saves without throwing",()=>{
    store.setItem(SAVE_KEY,"not json");expect(readSavedMatch()).toBeNull();
    const save=newSavedMatch(startGame("dextral","athos",()=>.4),"random");
    store.setItem(SAVE_KEY,JSON.stringify({...save,ruleset:"obsolete"}));
    expect(readSavedMatch()).toBeNull();
    store.setItem(SAVE_KEY,JSON.stringify({...save,game:{}}));
    expect(readSavedMatch()).toBeNull();
  });

  it("can clear only the matching saved match",()=>{
    const save=newSavedMatch(startGame("dextral","athos",()=>.4),"random");
    writeSavedMatch(save);clearSavedMatch("wrong-id");
    expect(readSavedMatch()?.id).toBe(save.id);
    clearSavedMatch(save.id);expect(readSavedMatch()).toBeNull();
  });

  it("records a completed game once and keeps a useful local summary",()=>{
    const save=newSavedMatch(startGame("prioresa_luna_llena","athos",()=>.4),"athos");
    save.game.phase="finished";save.game.winner="player";
    save.game.player.life=4;save.game.opponent.life=0;save.game.player.auguryHitsTotal=3;
    const record=completedMatch(save);
    expect(record?.result).toBe("win");
    expect(record?.auguryHits).toBe(3);
    expect(appendMatchHistory(record!)).toBe(true);
    expect(appendMatchHistory(record!)).toBe(false);
    expect(readMatchHistory()).toHaveLength(1);
    expect(summarizeHistory(readMatchHistory())).toMatchObject({total:1,wins:1,losses:0,winRate:100});
  });

  it("restores the exact 24-card multifaction recipe and classifies its result",()=>{
    const cardIds=[
      ...redCards.slice(0,6).flatMap(c=>[c.id,c.id]),
      ...blueCards.slice(0,6).flatMap(c=>[c.id,c.id])
    ];
    const deck={id:"mixed-test",name:"Mazo mixto",championId:"dextral",cardIds};
    const game=startGame("dextral","vinira",()=>.4,"player","normal",{player:deck});
    const saved=newSavedMatch(game,"vinira");
    expect(writeSavedMatch(saved)).toBe(true);
    const resumed=readSavedMatch();
    expect(resumed?.game.player.deckRecipe).toEqual(cardIds);
    const committed=resumed!;
    committed.game.phase="finished";
    committed.game.winner="player";
    const record=completedMatch(committed);
    expect(record).toMatchObject({mixedDeck:true,factions:["red","blue"]});
  });

  it("does not record unfinished matches",()=>{
    expect(completedMatch(newSavedMatch(startGame("dextral","athos",()=>.4),"random"))).toBeNull();
  });
});
