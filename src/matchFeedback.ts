import type { SavedMatch } from "./persistence";
import type { GameState } from "./engine/types";
import { cleanPlayerName, DEFAULT_PLAYER_NAME } from "./playerProfile";

const token=(import.meta.env.VITE_MATCH_FEEDBACK_TOKEN??"").trim();
const host=(import.meta.env.VITE_MATCH_FEEDBACK_HOST??"").trim().replace(/\/$/,"");
const gameVersion=import.meta.env.VITE_GAME_VERSION||"round-shadow-sweep-v3-dev";

export interface MatchFeedbackAnswers {
  fun: boolean|null;
  comment: string;
  liked: string;
  disliked: string;
  suggestion: string;
  unclear: string;
}

export function feedbackAvailable():boolean {
  return /^phc_[A-Za-z0-9_-]+$/.test(token)&&/^https:\/\/[a-z0-9.-]+$/i.test(host);
}

export function buildMatchFeedback(match:SavedMatch,game:GameState,playerName:string,
  mode:"classic"|"arcade",answers:MatchFeedbackAnswers) {
  return {
    match_id:match.id,
    player_name:cleanPlayerName(playerName).trim()||DEFAULT_PLAYER_NAME,
    champion:game.player.champion.name,
    champion_id:game.player.champion.id,
    rival_champion:game.opponent.champion.name,
    rival_champion_id:game.opponent.champion.id,
    difficulty:game.aiDifficulty??"normal",
    mode,
    winner:game.winner??"draw",
    player_life:game.player.life,
    rival_life:game.opponent.life,
    game_version:gameVersion,
    ruleset:match.ruleset,
    had_fun:answers.fun,
    comment:answers.comment.trim().slice(0,500),
    liked:answers.liked.trim().slice(0,500),
    disliked:answers.disliked.trim().slice(0,500),
    suggestion:answers.suggestion.trim().slice(0,500),
    unclear:answers.unclear.trim().slice(0,500)
  };
}

export async function submitMatchFeedback(feedback:ReturnType<typeof buildMatchFeedback>):Promise<void> {
  if(!feedbackAvailable())throw new Error("El envío no está disponible.");
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(host+"/capture/",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"omit",
      signal:controller.signal,
      body:JSON.stringify({
        api_key:token,
        event:"daggerlight_match_feedback",
        distinct_id:feedback.match_id,
        properties:{
          ...feedback,
          $insert_id:feedback.match_id,
          $process_person_profile:false,
          $geoip_disable:true
        }
      })
    });
    if(!response.ok)throw new Error("No se pudo enviar el feedback.");
    const acknowledgement=await response.json();
    if(acknowledgement?.status!==1)throw new Error("No se pudo confirmar el envío.");
  }finally{
    window.clearTimeout(timeout);
  }
}
