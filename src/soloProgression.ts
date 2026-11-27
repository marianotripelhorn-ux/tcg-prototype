import { champions } from "./engine/champions";
import { validateDeck } from "./engine/decks";
import type { DeckDefinition } from "./engine/decks";
import type { MatchRecord } from "./persistence";
import type { Faction } from "./types";
import type { AIDifficulty } from "./engine/types";

// Engine difficulty identifiers remain stable, including legacy saved matches.
export const difficultyLabel=(difficulty:AIDifficulty|undefined)=>difficulty==="easy"?"Normal":difficulty==="hard"?"Experto (anterior)":"Difícil";
export const newMatchDifficulty=(difficulty:AIDifficulty|undefined):AIDifficulty=>difficulty==="easy"?"easy":"normal";
export const STARTER_ORDER=["dextral","sinistral","empireos","santo_simetrico","athos","vinira","desartes","samas","prioresa_luna_llena"] as const;
export const PROGRESSION_KEY="daggerlight-solo-progression-v1";
export interface SoloProgression { wins:string[]; }
export function unlockedChampions(p:SoloProgression):string[]{return STARTER_ORDER.slice(0,2+p.wins.length);}
export function nextUnlock(p:SoloProgression):string|null{return STARTER_ORDER[2+p.wins.length]??null;}
export function unlockedFactions(p:SoloProgression):Faction[]{return [...new Set(unlockedChampions(p).map(id=>champions[id].faction))];}
export function deckUnlocked(deck:DeckDefinition,p:SoloProgression):boolean{
  const check=validateDeck(deck);
  return check.valid&&unlockedChampions(p).includes(deck.championId)&&check.factions.every(f=>unlockedFactions(p).includes(f));
}
export function creditVictory(p:SoloProgression,record:Pick<MatchRecord,"id"|"result"|"mode">):SoloProgression{
  if(!nextUnlock(p)||record.result!=="win"||record.mode==="tutorial"||p.wins.includes(record.id))return p;
  return {wins:[...p.wins,record.id]};
}
export function initialProgression(history:MatchRecord[]):SoloProgression{
  return history.reduce(creditVictory,{wins:[]} as SoloProgression);
}
export function readProgression(history:MatchRecord[]):SoloProgression{
  try{
    const raw=localStorage.getItem(PROGRESSION_KEY);
    if(raw!==null){
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed?.wins)&&parsed.wins.every((id:unknown)=>typeof id==="string"&&id.length>0))
        return {wins:[...new Set<string>(parsed.wins)].slice(0,STARTER_ORDER.length-2)};
    }
  }catch{}
  return initialProgression(history);
}
export function writeProgression(p:SoloProgression):void{
  try{localStorage.setItem(PROGRESSION_KEY,JSON.stringify(p));}catch{}
}
