import { allCards } from "./data";
import type { Faction } from "./types";

export const AVATAR_KEY="daggerlight-player-avatar-v1";
const factions:Faction[]=["red","blue","white","saints","ivory"];
export const avatarCards=factions.flatMap(faction=>allCards.filter(card=>card.faction===faction&&card.art).slice(0,2));
export const DEFAULT_AVATAR=avatarCards[0]?.id??"";

export function validAvatar(id:unknown):id is string {
  return typeof id==="string"&&avatarCards.some(card=>card.id===id);
}
export function readAvatar():string {
  try{const value=localStorage.getItem(AVATAR_KEY);return validAvatar(value)?value:DEFAULT_AVATAR;}
  catch{return DEFAULT_AVATAR;}
}
export function writeAvatar(id:string):string {
  const value=validAvatar(id)?id:DEFAULT_AVATAR;
  try{localStorage.setItem(AVATAR_KEY,value);}catch{/* Keep the selection in memory. */}
  return value;
}
