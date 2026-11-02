import type { MatchRecord } from "./persistence";

const CONSENT_KEY="daggerlight-analytics-consent-v1";
const DEVICE_KEY="daggerlight-analytics-install-v1";
const apiKey=(import.meta.env.VITE_POSTHOG_KEY??"").trim();
const host=(import.meta.env.VITE_POSTHOG_HOST??"https://us.i.posthog.com").trim().replace(/\/$/,"");

export function analyticsAvailable():boolean {
  return !!apiKey && /^https:\/\//.test(host);
}

export function analyticsOptedIn():boolean {
  try {return analyticsAvailable() && window.localStorage.getItem(CONSENT_KEY)==="yes";}
  catch{return false;}
}

export function setAnalyticsConsent(allowed:boolean) {
  try { window.localStorage.setItem(CONSENT_KEY,allowed?"yes":"no"); }
  catch { /* Optional analytics must never block a game. */ }
}

function anonymousDeviceId():string {
  try {
    let id=window.localStorage.getItem(DEVICE_KEY);
    if(!id) {
      id=typeof crypto!=="undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "playtest-"+Date.now()+"-"+Math.random().toString(36).slice(2);
      window.localStorage.setItem(DEVICE_KEY,id);
    }
    return id;
  }catch{return "temporary-anonymous";}
}

// Only completed-match summary is transmitted. Never send hands, decks,
// device identifiers from other services, names or full game states.
export function sendCompletedMatch(record:MatchRecord):void {
  if(!analyticsOptedIn())return;
  const payload={
    api_key:apiKey,
    event:"daggerlight_match_completed",
    distinct_id:anonymousDeviceId(),
    properties:{
      $ip:null,
      ruleset:record.ruleset,
      match_id:record.id,
      champion:record.championId,
      opponent:record.opponentId,
      difficulty:record.difficulty,
      result:record.result,
      rounds:record.rounds,
      duels:record.completedDuels,
      last_life:record.finalLife,
      rival_life:record.opponentLife,
      augury_hits:record.auguryHits,
      augury_heals:record.auguryHeals,
      no_quiero:record.noQuiero,
      mixed_deck:record.mixedDeck,
      factions:record.factions.join("+")
    },
    timestamp:record.finishedAt
  };
  try {
    void fetch(host+"/capture/",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
      keepalive:true,
      mode:"cors"
    }).catch(()=>{ /* Local persistence remains authoritative. */ });
  }catch{ /* Offline or blocked: no game interruption. */ }
}
