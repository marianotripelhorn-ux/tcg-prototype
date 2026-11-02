import { champions } from "./engine/champions";
import type { AIDifficulty, GameState } from "./engine/types";

export const SAVE_KEY = "daggerlight-match-save-v1";
export const HISTORY_KEY = "daggerlight-match-history-v1";
export const SAVE_VERSION = 1;
export const RULESET = "augurio-v2-blue-boost-2026-11";
const HISTORY_LIMIT = 250;

export interface SavedMatch {
  version: number;
  ruleset: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  rivalSelection: string;
  game: GameState;
}

export interface MatchRecord {
  id: string;
  version: number;
  ruleset: string;
  startedAt: string;
  finishedAt: string;
  championId: string;
  opponentId: string;
  difficulty: AIDifficulty;
  result: "win" | "loss" | "draw";
  rounds: number;
  completedDuels: number;
  finalLife: number;
  opponentLife: number;
  auguryHits: number;
  auguryHeals: number;
  noQuiero: number;
}

function storage():Storage|null {
  try { return typeof window !== "undefined" ? window.localStorage : null; }
  catch { return null; }
}

function validGame(game:unknown):game is GameState {
  if(!game || typeof game!=="object")return false;
  const s=game as Partial<GameState>;
  if(!s.player?.champion?.id || !champions[s.player.champion.id])return false;
  if(!s.opponent?.champion?.id || !champions[s.opponent.champion.id])return false;
  if(!["awaiting_player","awaiting_quiero"].includes(s.phase??""))return false;
  if(!Number.isInteger(s.round) || !Number.isInteger(s.turn) || s.round! < 1 || s.turn! < 1 || s.turn! > 3)return false;
  if(!Array.isArray(s.player.hand) || !Array.isArray(s.opponent.hand))return false;
  if(!Array.isArray(s.player.deck) || !Array.isArray(s.opponent.deck))return false;
  if(!Array.isArray(s.rounds) || !Array.isArray(s.events))return false;
  if(!s.duelScore || !Number.isFinite(s.duelScore.player) || !Number.isFinite(s.duelScore.opponent))return false;
  return true;
}

export function readSavedMatch():SavedMatch|null {
  const store=storage();if(!store)return null;
  try {
    const saved=JSON.parse(store.getItem(SAVE_KEY)??"null") as Partial<SavedMatch>|null;
    if(!saved || saved.version!==SAVE_VERSION || saved.ruleset!==RULESET || typeof saved.id!=="string"
      || typeof saved.createdAt!=="string" || !validGame(saved.game))return null;
    return saved as SavedMatch;
  }catch{return null;}
}

export function newSavedMatch(game:GameState,rivalSelection:string):SavedMatch {
  const now=new Date().toISOString();
  const id=typeof crypto!=="undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "match-"+Date.now()+"-"+Math.random().toString(36).slice(2);
  return {version:SAVE_VERSION,ruleset:RULESET,id,createdAt:now,updatedAt:now,rivalSelection,game};
}

export function writeSavedMatch(match:SavedMatch):boolean {
  const store=storage();if(!store)return false;
  try {
    store.setItem(SAVE_KEY,JSON.stringify({...match,updatedAt:new Date().toISOString()}));
    return true;
  }catch{return false;}
}

export function clearSavedMatch(matchId?:string):void {
  const store=storage();if(!store)return;
  try {
    if(!matchId || readSavedMatch()?.id===matchId)store.removeItem(SAVE_KEY);
  }catch{ /* Storage unavailable. */ }
}

export function readMatchHistory():MatchRecord[] {
  const store=storage();if(!store)return [];
  try {
    const arr=JSON.parse(store.getItem(HISTORY_KEY)??"[]");
    return Array.isArray(arr) ? arr.filter((r:unknown)=>{
      if(!r || typeof r!=="object")return false;
      const m=r as Partial<MatchRecord>;
      return typeof m.id==="string" && typeof m.championId==="string"
        && typeof m.opponentId==="string" && ["win","loss","draw"].includes(m.result??"");
    }).slice(-HISTORY_LIMIT) : [];
  }catch{return [];}
}

export function completedMatch(match:SavedMatch):MatchRecord|null {
  const {game}=match;
  if(game.phase!=="finished" || !game.winner)return null;
  const noQuiero=game.rounds.filter(r=>r.reason!=="completed").length;
  return {
    id:match.id,version:SAVE_VERSION,ruleset:RULESET,
    startedAt:match.createdAt,finishedAt:new Date().toISOString(),
    championId:game.player.champion.id,opponentId:game.opponent.champion.id,
    difficulty:game.aiDifficulty??"normal",
    result:game.winner==="player"?"win":game.winner==="opponent"?"loss":"draw",
    rounds:game.rounds.length || game.round,
    completedDuels:game.events.filter(e=>e.kind==="duel").length,
    finalLife:game.player.life,opponentLife:game.opponent.life,
    auguryHits:game.player.auguryHitsTotal,auguryHeals:game.player.auguryHeals,
    noQuiero
  };
}

export function appendMatchHistory(record:MatchRecord):boolean {
  const store=storage();if(!store)return false;
  try {
    const previous=readMatchHistory();
    if(previous.some(m=>m.id===record.id))return false;
    store.setItem(HISTORY_KEY,JSON.stringify([...previous,record].slice(-HISTORY_LIMIT)));
    return true;
  }catch{return false;}
}

export function summarizeHistory(history:MatchRecord[]) {
  const wins=history.filter(m=>m.result==="win").length;
  const losses=history.filter(m=>m.result==="loss").length;
  const draws=history.length-wins-losses;
  return {total:history.length,wins,losses,draws,winRate:history.length?Math.round(wins/history.length*100):0};
}
