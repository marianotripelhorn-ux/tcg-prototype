import { championShortName } from "./championArtwork";
import { factionLabels } from "./data";
import { champions } from "./engine/champions";
import type { LibraryDeck } from "./deckLibraryStorage";
import { summarizeHistory } from "./persistence";
import type { MatchRecord } from "./persistence";

export function starterDeckLabel(championId:string):string {
  const champion=champions[championId];
  return champion ? factionLabels[champion.faction]+" — "+championShortName(champion.name) : "Mazo inicial";
}

export function deckDisplayName(id:string|undefined,name:string|undefined,championId:string,decks:LibraryDeck[]):string {
  if(!id)return "Mazo no registrado";
  const current=decks.find(deck=>deck.id===id);
  if(current)return current.name;
  if(id==="mono-"+championId)return starterDeckLabel(championId);
  return name || "Mazo eliminado";
}

export function profileStatistics(history:MatchRecord[],decks:LibraryDeck[]) {
  const tracked=history.filter(record=>record.mode!=="tutorial");
  const championRows=Object.keys(champions).map(id=>({
    id,name:championShortName(champions[id].name),faction:champions[id].faction,
    ...summarizeHistory(tracked.filter(record=>record.championId===id))
  })).sort((a,b)=>b.total-a.total||b.wins-a.wins);
  const deckIds=new Set([...decks.map(deck=>deck.id),
    ...tracked.flatMap(record=>typeof record.deckId==="string"&&record.deckId?[record.deckId]:[])]);
  const deckRows=Array.from(deckIds,id=>{
    const records=tracked.filter(record=>record.deckId===id);
    const current=decks.find(deck=>deck.id===id);
    const last=records.at(-1);
    const championId=current?.championId??last?.championId??"";
    return {id,championId,name:deckDisplayName(id,last?.deckName,championId,decks),
      ...summarizeHistory(records)};
  }).sort((a,b)=>b.total-a.total||b.wins-a.wins||a.name.localeCompare(b.name));
  return {summary:summarizeHistory(tracked),championRows,deckRows,
    unassigned:tracked.filter(record=>!record.deckId).length,
    recent:[...tracked].reverse()};
}
