import {describe,it,expect} from "vitest";
import {STARTER_ORDER,creditVictory,unlockedChampions,unlockedFactions,nextUnlock,deckUnlocked,difficultyLabel,newMatchDifficulty} from "./soloProgression";
import {makeMonoDeckDefinition} from "./engine/decks";
describe("Solo unlock progression",()=>{
  it("starts with red and blue only; unlocks four factions before their alternates; Priory is last",()=>{
    let p={wins:[] as string[]};
    expect(unlockedChampions(p)).toEqual(["dextral","sinistral"]);
    for(let i=0;i<7;i++){
      expect(nextUnlock(p)).toBe(STARTER_ORDER[i+2]);
      p=creditVictory(p,{id:"win-"+i,result:"win",mode:"solo"});
      expect(unlockedChampions(p)).toHaveLength(i+3);
      if(i===1)expect(unlockedFactions(p)).toEqual(["red","blue","white","saints"]);
    }
    expect(nextUnlock(p)).toBeNull();
    expect(unlockedFactions(p)).toContain("ivory");
  });
  it("ignores losses, draws, tutorial and duplicate match IDs",()=>{
    const p={wins:[] as string[]};
    for(const result of ["loss","draw"] as const)expect(creditVictory(p,{id:"1",result,mode:"solo"})).toBe(p);
    expect(creditVictory(p,{id:"1",result:"win",mode:"tutorial"})).toBe(p);
    const next=creditVictory(p,{id:"1",result:"win",mode:"arcade"});
    expect(creditVictory(next,{id:"1",result:"win",mode:"arcade"})).toBe(next);
  });
  it("protects custom deck recipes and preserves old difficulty identifiers",()=>{
    const p={wins:[] as string[]};
    expect(deckUnlocked(makeMonoDeckDefinition("dextral"),p)).toBe(true);
    expect(deckUnlocked(makeMonoDeckDefinition("athos"),p)).toBe(false);
    expect(deckUnlocked(makeMonoDeckDefinition("prioresa_luna_llena"),p)).toBe(false);
    expect(difficultyLabel("easy")).toBe("Normal");
    expect(difficultyLabel("normal")).toBe("Difícil");
    expect(newMatchDifficulty("hard")).toBe("normal");
  });
});
