import type { SavedMatch } from "./persistence";
import type { MatchRecord } from "./persistence";
import type { GameState } from "./engine/types";
const KEY="daggerlight-playtest-v1";
const LIMIT=100;
export interface Feedback { diversion:number; claridad:number; comentario:string; }
export interface PlaytestRecord {
  id:string; mode:"IA"|"PVP"; at:string; championId:string; rivalId:string;
  result:"win"|"loss"|"draw"; rounds:number; duels:number; life:number;
  opponentLife:number; actions:{kind:string;text:string}[]; feedback?:Feedback;
}
function db():Storage|null {
  try{return typeof window!=="undefined"?window.localStorage:null;}catch{return null;}
}
export function readPlaytests():PlaytestRecord[] {
  try {
    const saved=JSON.parse(db()?.getItem(KEY)||"[]") as unknown;
    return Array.isArray(saved)?saved.filter((r):r is PlaytestRecord=>
      !!r && typeof r==="object" && typeof r.id==="string" && Array.isArray(r.actions)
    ).slice(-LIMIT):[];
  }catch{return [];}
}
export function savePlaytest(record:PlaytestRecord):void {
  try {
    const current=readPlaytests();
    const index=current.findIndex(r=>r.id===record.id);
    if(index!==-1)current[index]={...current[index],...record,feedback:record.feedback||current[index].feedback};
    else current.push(record);
    db()?.setItem(KEY,JSON.stringify(current.slice(-LIMIT)));
  }catch{/* Browsers with disabled storage still allow gameplay. */}
}
export function saveFeedback(id:string,feedback:Feedback) {
  const existing=readPlaytests().find(r=>r.id===id);
  if(existing)savePlaytest({...existing,feedback});
}
export function saveAiMatch(match:SavedMatch,summary:MatchRecord) {
  const game=match.game;
  savePlaytest({
    id:match.id,mode:"IA",at:summary.finishedAt,championId:summary.championId,
    rivalId:summary.opponentId,result:summary.result,rounds:summary.rounds,
    duels:summary.completedDuels,life:summary.finalLife,opponentLife:summary.opponentLife,
    actions:game.events.map(e=>({kind:e.kind||"info",text:e.text}))
  });
}
export function saveHumanMatch(roomCode:string,game:GameState) {
  if(game.phase!=="finished"||!game.winner)return;
  savePlaytest({
    id:"pvp-"+roomCode,mode:"PVP",at:new Date().toISOString(),
    championId:game.player.champion.id,rivalId:game.opponent.champion.id,
    result:game.winner==="player"?"win":game.winner==="opponent"?"loss":"draw",
    rounds:game.rounds.length||game.round,duels:game.events.filter(e=>e.kind==="duel").length,
    life:game.player.life,opponentLife:game.opponent.life,
    actions:game.events.map(e=>({kind:e.kind||"info",text:e.text}))
  });
}
function csv(s:string) {return '"'+s.replace(/"/g,'""')+'"';}
export function playtestCsv(records:PlaytestRecord[]):string {
  return "\uFEFF"+[
    ["id","tipo","fecha","campeon","rival","resultado","rondas","duelos","vida","vida_rival","diversion","claridad","comentario"].join(","),
    ...records.map(r=>[
      r.id,r.mode,r.at,r.championId,r.rivalId,r.result,r.rounds,r.duels,r.life,r.opponentLife,
      r.feedback?.diversion??"",r.feedback?.claridad??"",r.feedback?.comentario||""
    ].map(v=>csv(String(v))).join(","))
  ].join("\r\n");
}
export function downloadPlaytest(name:string,content:string,type="application/json") {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
