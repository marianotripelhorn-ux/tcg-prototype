import type { EnginePlay } from "./types";

const conditionalEffectNotes: Record<string,string> = {
  last_augury_hit2: "+2 último Augurio acertado",
  lower_life2: "+2 menos Vida",
  enemy_repeat2: "+2 rival repite posición",
  last_augury_miss3: "+3 último Augurio fallado",
  enemy_change2: "+2 rival cambia de posición",
  third2: "+2 tercer duelo"
};

export type EffectFeedback = "activated" | "inactive" | "forecast" | "none";

export function playEffectFeedback(play:EnginePlay):EffectFeedback {
  if (play.card.effect.startsWith("augury_")) return "forecast";
  const marker=conditionalEffectNotes[play.card.effect];
  if (!marker) return "none";
  return play.notes?.some(note=>note===marker) ? "activated" : "inactive";
}

export function playPowerDelta(play:EnginePlay):number {
  return (play.finalPower ?? play.card.power)-play.card.power;
}

export function formatPowerDelta(play:EnginePlay):string | null {
  const delta=playPowerDelta(play);
  return delta===0?null:(delta>0?"+":"−")+Math.abs(delta)+" PODER";
}
