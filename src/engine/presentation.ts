import type { EnginePlay } from "./types";

const conditionalEffectNotes: Record<string,string> = {
  // Explicit current-duel powers only. Queued, reactive and future effects are
  // intentionally excluded to avoid falsely claiming their effect failed.
  bonus2: "+2 Diestra",
  first_or_prev_diestra2: "+2 apertura/continuación en Diestra",
  won_prev2: "+2 victoria previa",
  empty_sin5: "+5 Siniestra sin usar",
  trono_before4: "+4 tras Trono",
  diestra_before3: "+3 tras Diestra",
  second_special3: "+3 segunda Diestra",
  enemy_printed6_2: "+2 rival con Poder impreso 6+",
  copy_plus2: "+2 Prodigio",
  third4: "+4 tercer duelo",
  archive_here: " Archivo",
  archive_empty2: "+2 Archivo vacío",
  archive_two2: "+2 Archivo con 2+",
  opp_archive_more2: "+2 Archivo rival mayor",
  archive_three6: "+6 Archivo con 3+",
  trono_archive_three3: "+3 Trono con 3+",
  least_archive2: "+2 Archivo menos poblado",
  opp_archive_capped: " Archivo rival",
  archive_leads_global: " posiciones de Archivo por delante",
  archive_exact2_5: "+5 Archivo exactamente 2",
  archive_all_diff3: "+3 Archivos distintos",
  lateral1: "+1 posición lateral",
  losing_round2: "+2 vas perdiendo",
  score_tied1: "+1 marcador empatado",
  axis_lateral2: "+2 lateral previa",
  opposite_prev3: "+3 posición opuesta",
  opposite_enemy2: "+2 posición rival opuesta",
  first_round3: "+3 primera carta de la ronda",
  winning_round2: "+2 vas ganando",
  enemy_affinity2: "+2 rival con habilidad de posición",
  prev_draw3: "+3 empate anterior",
  win_loss4: "+4 victoria + derrota",
  first_opposite3: "+3 refleja la primera posición",
  second_trono_double: "Rey sin corona",
  equal_life_double: "Avatar de Simetría",
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
  return play.notes?.some(note=>note.includes(marker)) ? "activated" : "inactive";
}

export function playPowerDelta(play:EnginePlay):number {
  return (play.finalPower ?? play.card.power)-play.card.power;
}

export function formatPowerDelta(play:EnginePlay):string | null {
  const delta=playPowerDelta(play);
  return delta===0?null:(delta>0?"+":"−")+Math.abs(delta)+" PODER";
}
