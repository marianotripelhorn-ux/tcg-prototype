import type { AIDifficulty, DuelSummary, GameState } from "./engine/types";
import type { BoardMotionPhase } from "./board-redesign/motion";

export const TUTORIAL_MATCH:Readonly<{
  championId:"dextral";opponentId:"sinistral";difficulty:AIDifficulty;
}>=Object.freeze({championId:"dextral",opponentId:"sinistral",difficulty:"easy"});

export const WELCOME_KEY="daggerlight-welcome-v1";

export function hasSeenWelcome():boolean {
  try { return localStorage.getItem(WELCOME_KEY)==="seen"; }
  catch { return false; }
}

export function rememberWelcome():void {
  try { localStorage.setItem(WELCOME_KEY,"seen"); }
  catch {/* The current visit can continue even when storage is unavailable. */}
}

export function guidedOpeningHint({round,turn,phase,motion,result,inspecting,cardSelected}:{
  round:number;turn:number;phase:GameState["phase"];motion?:BoardMotionPhase;
  result?:DuelSummary["outcome"];inspecting:boolean;cardSelected:boolean;
}):string|null {
  if(phase==="finished")return null;
  if(motion==="round"||motion==="archive")return "Al cerrar la ronda, cada carta jugada entra al Archivo de su posición.";
  if(motion==="round-wipe"||motion==="round-wipe-reveal"||motion==="archive-reveal")return "Podés consultar tus cartas archivadas en Archivos.";
  if(motion==="deal"&&round===2)return "Ya jugaste tu primera ronda. Probá otras posiciones con tu nueva mano.";
  if(round!==1)return null;
  if(result==="draw")return "El Poder final quedó igual. En un empate, nadie pierde Vida.";
  if(result)return result==="player"?"Ganaste el duelo. El rival pierde 1 Vida.":"El rival ganó el duelo. Perdés 1 Vida.";
  if(motion==="match-entry"||motion==="deal")return "Vas a jugar contra Vor Calasta. Tu primera mano está por llegar.";
  if(motion==="flight"||motion==="duel")return "Mirá el Poder de cada carta. Su habilidad puede cambiarlo antes del resultado.";
  if(motion==="quiero-ai")return "El rival aceptó jugar el tercer duelo.";
  if(phase==="awaiting_quiero")return "Elegí Quiero para disputar el tercer duelo o No quiero para cerrar la ronda.";
  if(inspecting)return "Leé la habilidad de la carta. Algunas se activan al jugarla en una posición específica.";
  if(cardSelected)return "Elegí una de las posiciones habilitadas para jugar la carta.";
  return turn===1?"Elegí una carta de tu mano para ampliarla y leer su habilidad.":"Elegí otra carta. Fijate qué posición le conviene.";
}
