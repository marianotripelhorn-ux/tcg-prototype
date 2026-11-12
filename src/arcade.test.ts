import {describe,it,expect} from "vitest";
import {champions} from "./engine/champions";
import {newArcadeRun,markArcadeResult,advanceArcade,arcadeOpponent} from "./arcade";
import {cleanPlayerName} from "./playerProfile";

describe("Arcade gauntlet",()=>{
  it("includes every other playable champion exactly once",()=>{
    for(const id of Object.keys(champions)){
      const run=newArcadeRun(id,"easy",()=>0.4);
      expect(run.opponents).toHaveLength(Object.keys(champions).length-1);
      expect(new Set(run.opponents).size).toBe(run.opponents.length);
      expect(run.opponents).not.toContain(id);
      expect(arcadeOpponent(run)).toBeTruthy();
    }
  });
  it("progresses only after victories and finishes after the final opponent",()=>{
    let run=newArcadeRun("dextral","normal",()=>0.8);
    expect(advanceArcade(run)).toBeNull();
    for(let i=0;i<run.opponents.length;i++){
      run=markArcadeResult(run,run.opponents[i],true);
      if(i<run.opponents.length-1){expect(run.status).toBe("active");run=advanceArcade(run)!;expect(run.index).toBe(i+1);}
    }
    expect(run.status).toBe("complete");
    expect(run.victories).toHaveLength(8);
    expect(advanceArcade(run)).toBeNull();
  });
  it("stops on a loss and rejects duplicate win updates",()=>{
    let run=newArcadeRun("samas","hard",()=>0.3);
    run=markArcadeResult(run,arcadeOpponent(run)!,true);
    expect(markArcadeResult(run,arcadeOpponent(run)!,true).victories).toHaveLength(1);
    run=advanceArcade(run)!;
    run=markArcadeResult(run,arcadeOpponent(run)!,false);
    expect(run.status).toBe("lost");
    expect(advanceArcade(run)).toBeNull();
  });
  it("cleans persistent names, preserving accents",()=>{
    expect(cleanPlayerName("  Juán 🔥  O'Neil  ").trim()).toBe("Juán O'Neil");
    expect(cleanPlayerName("x".repeat(40))).toHaveLength(20);
  });
});
