import { describe, expect, it } from "vitest";
import { startGame } from "./engine/game";
import { makeMonoDeckDefinition } from "./engine/decks";
import { completedMatch, newSavedMatch } from "./persistence";
import { makeLibraryDeck } from "./deckLibraryStorage";
import { profileStatistics } from "./profileStatistics";
import type { MatchRecord } from "./persistence";

function finished(deck?:{id:string;name:string}, result:"win"|"loss"|"draw"="win", mode?:"solo"|"arcade"|"tutorial"):MatchRecord{
  const game=startGame("dextral","athos",()=>.4);
  game.phase="finished";game.winner=result==="win"?"player":result==="loss"?"opponent":"draw";
  return completedMatch(newSavedMatch(game,"athos","Tester",deck,mode))!;
}
describe("local profile statistics",()=>{
  it("retains deck identity across saves, completion, and deck renames",()=>{
    const original=makeLibraryDeck({...makeMonoDeckDefinition("dextral"),name:"Original"});
    const renamed=makeLibraryDeck({...original,name:"Renombrado"},original);
    const copy=makeLibraryDeck({...original,name:"Copia"});
    const record=finished(original);
    expect(record.deckId).toBe(original.id);
    expect(record.deckName).toBe("Original");
    const stats=profileStatistics([record,finished(original,"loss")],[renamed,copy]);
    expect(stats.deckRows.find(row=>row.id===renamed.id)).toMatchObject({name:"Renombrado",total:2,wins:1,winRate:50});
    expect(stats.deckRows.find(row=>row.id===copy.id)?.total).toBe(0);
  });
  it("does not invent historical deck assignments; excludes newly tagged guided matches",()=>{
    const starter=makeMonoDeckDefinition("dextral");
    const history=[finished(undefined,"loss"),finished(starter,"win","solo"),finished(starter,"win","tutorial")];
    const stats=profileStatistics(history,[]);
    expect(stats.summary).toMatchObject({total:2,wins:1,losses:1,winRate:50});
    expect(stats.unassigned).toBe(1);
    expect(stats.deckRows[0]).toMatchObject({id:starter.id,total:1,wins:1});
    expect(stats.championRows.find(row=>row.id==="dextral")?.total).toBe(2);
  });
  it("keeps records of deleted decks under the last recorded name",()=>{
    const record=finished({id:"deleted",name:"Mazo anterior"});
    expect(profileStatistics([record],[]).deckRows[0]).toMatchObject({id:"deleted",name:"Mazo anterior",total:1});
  });
});
