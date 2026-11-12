/** This profile belongs only to the experimental LAB site, not the public game. */
const NAME_KEY="daggerlight-lab-player-name-v1";
export const DEFAULT_PLAYER_NAME="JUGADOR";
export function cleanPlayerName(value:string):string{
  return value.replace(/[^\p{L}\p{N} ._'-]/gu,"").replace(/\s+/g," ").slice(0,20);
}
export function readPlayerName():string{
  try{return cleanPlayerName(localStorage.getItem(NAME_KEY)||"")||DEFAULT_PLAYER_NAME;}
  catch{return DEFAULT_PLAYER_NAME;}
}
export function writePlayerName(value:string):string{
  const name=cleanPlayerName(value);
  try{if(name)localStorage.setItem(NAME_KEY,name);else localStorage.removeItem(NAME_KEY);}
  catch{/* Storage disabled; retain current name for this session. */}
  return name;
}
