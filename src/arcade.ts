import { champions } from "./engine/champions";
import type { AIDifficulty } from "./engine/types";
const KEY="daggerlight-lab-arcade-v1";

export interface ArcadeRun{
  id:string;
  championId:string;
  difficulty:AIDifficulty;
  opponents:string[];
  index:number;
  victories:string[];
  startedAt:string;
  status:"active"|"lost"|"complete";
}
export function newArcadeRun(championId:string,difficulty:AIDifficulty,rng:()=>number=Math.random):ArcadeRun{
  if(!champions[championId])throw new Error("Campeón desconocido.");
  const opponents=Object.keys(champions).filter(id=>id!==championId);
  for(let i=opponents.length-1;i>0;i--){
    const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));
    [opponents[i],opponents[j]]=[opponents[j],opponents[i]];
  }
  return {id:"arcade-"+Date.now()+"-"+Math.floor(rng()*1000000),championId,difficulty,
    opponents,index:0,victories:[],startedAt:new Date().toISOString(),status:"active"};
}
export function arcadeOpponent(run:ArcadeRun):string|null{
  return run.opponents[run.index]||null;
}
export function markArcadeResult(run:ArcadeRun,opponentId:string,won:boolean):ArcadeRun{
  if(run.status!=="active"||arcadeOpponent(run)!==opponentId)return run;
  if(!won)return {...run,status:"lost"};
  const victories=run.victories.includes(opponentId)?run.victories:[...run.victories,opponentId];
  return {...run,victories,status:victories.length===run.opponents.length?"complete":"active"};
}
export function advanceArcade(run:ArcadeRun):ArcadeRun|null{
  if(run.status!=="active"||!run.victories.includes(arcadeOpponent(run)||""))return null;
  if(run.index+1>=run.opponents.length)return null;
  return {...run,index:run.index+1};
}
export function writeArcadeRun(run:ArcadeRun|null):void{
  try{if(run)localStorage.setItem(KEY,JSON.stringify(run));else localStorage.removeItem(KEY);}
  catch{/* Disabled local storage must not stop a run. */}
}
export function readArcadeRun():ArcadeRun|null{
  try{
    const run=JSON.parse(localStorage.getItem(KEY)||"null") as ArcadeRun|null;
    if(!run||!champions[run.championId]||!["easy","normal","hard"].includes(run.difficulty)||
      !Array.isArray(run.opponents)||!Array.isArray(run.victories)||run.opponents.length!==Object.keys(champions).length-1||
      run.opponents.some(id=>!champions[id]||id===run.championId)||
      new Set(run.opponents).size!==run.opponents.length||
      !Number.isInteger(run.index)||run.index<0||run.index>=run.opponents.length||
      !["active","lost","complete"].includes(run.status))return null;
    return run;
  }catch{return null;}
}
