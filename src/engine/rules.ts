import { positionLabels, positions } from "../data";
import type { CardDefinition, Position } from "../types";
import type { DuelPowerResult, EnginePlay, GameState, PlayerState } from "./types";

export function countPosition(player: PlayerState, position: Position) {
  return player.roundPlays.filter(play => play.position === position).length;
}

export function mostPopulatedArchive(player: PlayerState, position: Position) {
  const max = Math.max(...positions.map(pos => player.archives[pos].length));
  return player.archives[position].length === max;
}

export function capacity(player: PlayerState, position: Position) {
  if (player.champion.id === "athos" && position === "diestra") {
    return player.athosDiestraCapacity || 1;
  }
  if (player.champion.id === "desartes" && mostPopulatedArchive(player, position)) {
    return 2;
  }
  return position === player.champion.special ? 2 : 1;
}

export function legalPositions(player: PlayerState) {
  return positions.filter(position => countPosition(player, position) < capacity(player, position));
}

export function affinityActive(player: PlayerState, card: CardDefinition, position: Position) {
  if (!card.affinity) return false;
  if (position === card.affinity) return true;
  return player.champion.id === "vinira" && !player.viniraUsed;
}

function isOppositeLateral(a: Position, b: Position) {
  return (a === "siniestra" && b === "diestra") || (a === "diestra" && b === "siniestra");
}

function ownScore(state: GameState, player: PlayerState): [number, number] {
  return player === state.player
    ? [state.duelScore.player, state.duelScore.opponent]
    : [state.duelScore.opponent, state.duelScore.player];
}

function opponentLife(state: GameState, player: PlayerState) {
  return player === state.player ? state.opponent.life : state.player.life;
}

function baseDoubleReasons(state: GameState, self: PlayerState, card: CardDefinition) {
  const reasons: string[] = [];
  if (self.nextBaseDouble) reasons.push("Mártir");
  if (
    card.effect === "second_trono_double" &&
    state.turn === 3 &&
    self.roundPlays[1]?.position === "trono"
  ) reasons.push("Rey sin corona");
  if (card.effect === "equal_life_double" && self.life === opponentLife(state, self)) {
    reasons.push("Avatar de Simetría");
  }
  return reasons;
}

function intrinsicPower(
  state: GameState,
  play: EnginePlay,
  self: PlayerState,
  opponent: PlayerState,
  opponentPlay: EnginePlay | null,
  affinity: boolean,
  notes: string[]
) {
  const card = play.card;
  const doubles = baseDoubleReasons(state, self, card);
  let power = card.power * (1 + doubles.length);
  doubles.forEach(reason => notes.push(`+${card.power} duplicación · ${reason}`));

  if (self.nextBuff) {
    power += self.nextBuff;
    notes.push(...self.nextBuffNotes);
  }
  if (self.auguryBuff) {
    power += self.auguryBuff;
    notes.push(`+${self.auguryBuff} Augurio`);
  }
  if (self.nextPositionBoost && affinity) {
    power += self.nextPositionBoost;
    notes.push(`+${self.nextPositionBoost} Invocador`);
  }
  if (self.nextPositionSpecificBoost && play.position === self.nextPositionSpecificBoost.position) {
    power += self.nextPositionSpecificBoost.amount;
    notes.push(`+${self.nextPositionSpecificBoost.amount} ${self.nextPositionSpecificBoost.source}`);
  }
  if (self.empireanBuff) {
    power += self.empireanBuff;
    notes.push("+2 Señor de los Archivos");
  }
  if (self.incomingDebuff) {
    power -= self.incomingDebuff;
    notes.push(...self.incomingNotes);
  }

  if (card.effect === "bonus2" && affinity) {
    power += 2; notes.push(`+2 ${positionLabels[card.affinity!]}`);
  } else if (card.effect === "first_or_prev_diestra2" && affinity && (!self.roundPlays.length || self.roundPlays.at(-1)?.position === "diestra")) {
    power += 2; notes.push("+2 apertura/continuación en Diestra");
  } else if (card.effect === "won_prev2" && affinity && self.duelResults.at(-1) === "win") {
    power += 2; notes.push("+2 victoria previa");
  } else if (card.effect === "empty_sin5" && affinity && countPosition(self, "siniestra") === 0 && play.position !== "siniestra") {
    power += 5; notes.push("+5 Siniestra sin usar");
  } else if (card.effect === "trono_before4" && affinity && countPosition(self, "trono") > 0) {
    power += 4; notes.push("+4 tras Trono");
  } else if (card.effect === "diestra_before3" && affinity && countPosition(self, "diestra") > 0) {
    power += 3; notes.push("+3 tras Diestra");
  } else if (card.effect === "second_special3" && affinity && countPosition(self, "diestra") > 0) {
    power += 3; notes.push("+3 segunda Diestra");
  } else if (card.effect === "enemy_printed6_2" && affinity && opponentPlay && opponentPlay.card.power >= 6) {
    power += 2; notes.push("+2 rival con Poder impreso 6+");
  } else if (card.effect === "copy_plus2" && affinity && opponentPlay) {
    power = opponentPlay.card.power + 2 + self.nextBuff + self.auguryBuff +
      (self.nextPositionBoost && affinity ? self.nextPositionBoost : 0) +
      (self.nextPositionSpecificBoost && play.position === self.nextPositionSpecificBoost.position ? self.nextPositionSpecificBoost.amount : 0) -
      self.incomingDebuff;
    notes.length = 0;
    notes.push(`Poder impreso rival ${opponentPlay.card.power}`, "+2 Prodigio");
    if (self.nextBuff) notes.push(...self.nextBuffNotes);
    if (self.auguryBuff) notes.push(`+${self.auguryBuff} Augurio`);
    if (self.nextPositionBoost && affinity) notes.push(`+${self.nextPositionBoost} Invocador`);
    if (self.nextPositionSpecificBoost && play.position === self.nextPositionSpecificBoost.position) {
      notes.push(`+${self.nextPositionSpecificBoost.amount} ${self.nextPositionSpecificBoost.source}`);
    }
    if (self.incomingDebuff) notes.push(...self.incomingNotes);
  } else if (card.effect === "third4" && affinity && state.turn === 3) {
    power += 4; notes.push("+4 tercer duelo");
  } else if (card.effect === "archive_here") {
    const n = self.archives[play.position].length; power += n; if (n) notes.push(`+${n} Archivo`);
  } else if (card.effect === "archive_empty2" && self.archives[play.position].length === 0) {
    power += 2; notes.push("+2 Archivo vacío");
  } else if (card.effect === "archive_two2" && self.archives[play.position].length >= 2) {
    power += 2; notes.push("+2 Archivo con 2+");
  } else if (card.effect === "opp_archive_more2" && opponent.archives[play.position].length > self.archives[play.position].length) {
    power += 2; notes.push("+2 Archivo rival mayor");
  } else if (card.effect === "archive_three6" && self.archives[play.position].length >= 3) {
    power += 6; notes.push("+6 Archivo con 3+");
  } else if (card.effect === "trono_archive_three3" && affinity && self.archives.trono.length >= 3) {
    power += 3; notes.push("+3 Trono con 3+");
  } else if (card.effect === "least_archive2" && self.archives[play.position].length === Math.min(...positions.map(pos => self.archives[pos].length))) {
    power += 2; notes.push("+2 Archivo menos poblado");
  } else if (card.effect === "opp_archive_capped") {
    const n = Math.min(4, opponent.archives[play.position].length); power += n; if (n) notes.push(`+${n} Archivo rival`);
  } else if (card.effect === "clear_archive2x") {
    const n = self.archives[play.position].length; power += 2 * n; notes.push(`+${2*n} Libro de Amaram`);
  } else if (card.effect === "lateral1" && play.position !== "trono") {
    power += 1; notes.push("+1 posición lateral");
  } else if (card.effect === "losing_round2") {
    const [own, rival] = ownScore(state, self); if (own < rival) { power += 2; notes.push("+2 vas perdiendo"); }
  } else if (card.effect === "score_tied1") {
    const [own, rival] = ownScore(state, self); if (own === rival) { power += 1; notes.push("+1 marcador empatado"); }
  } else if (card.effect === "axis_lateral2" && affinity && self.roundPlays.some(p => p.position === "siniestra" || p.position === "diestra")) {
    power += 2; notes.push("+2 lateral previa");
  } else if (card.effect === "opposite_prev3" && self.roundPlays.length && isOppositeLateral(self.roundPlays.at(-1)!.position, play.position)) {
    power += 3; notes.push("+3 posición opuesta");
  } else if (card.effect === "opposite_enemy2" && opponentPlay && isOppositeLateral(opponentPlay.position, play.position)) {
    power += 2; notes.push("+2 posición rival opuesta");
  } else if (card.effect === "first_round3" && !self.roundPlays.length) {
    power += 3; notes.push("+3 primera carta de la ronda");
  } else if (card.effect === "winning_round2") {
    const [own, rival] = ownScore(state, self); if (own > rival) { power += 2; notes.push("+2 vas ganando"); }
  } else if (card.effect === "enemy_affinity2" && affinity && !!opponentPlay?.card.affinity) {
    power += 2; notes.push("+2 rival con habilidad de posición");
  } else if (card.effect === "prev_draw3" && self.duelResults.at(-1) === "draw") {
    power += 3; notes.push("+3 empate anterior");
  } else if (card.effect === "win_loss4" && self.duelResults.includes("win") && self.duelResults.includes("loss")) {
    power += 4; notes.push("+4 victoria + derrota");
  } else if (card.effect === "first_opposite3" && self.roundPlays.length && isOppositeLateral(self.roundPlays[0].position, play.position)) {
    power += 3; notes.push("+3 refleja la primera posición");
  } else if (card.effect === "archive_leads_global") {
    const n = positions.filter(pos => self.archives[pos].length > opponent.archives[pos].length).length;
    power += n; if (n) notes.push(`+${n} posiciones de Archivo por delante`);
  } else if (card.effect === "archive_exact2_5" && self.archives[play.position].length === 2) {
    power += 5; notes.push("+5 Archivo exactamente 2");
  } else if (card.effect === "archive_all_diff3") {
    const values = positions.map(pos => self.archives[pos].length);
    if (new Set(values).size === 3) { power += 3; notes.push("+3 Archivos distintos"); }
  } else if (card.effect === "last_augury_hit2" && self.lastAuguryResult === "hit") {
    power += 2; notes.push("+2 último Augurio acertado");
  } else if (card.effect === "lower_life2" && self.life < opponentLife(state, self)) {
    power += 2; notes.push("+2 menos Vida");
  } else if (card.effect === "enemy_repeat2" && opponentPlay && opponent.roundPlays.some(p => p.position === opponentPlay.position)) {
    power += 2; notes.push("+2 rival repite posición");
  } else if (card.effect === "last_augury_miss3" && self.lastAuguryResult === "miss") {
    power += 3; notes.push("+3 último Augurio fallado");
  } else if (card.effect === "enemy_change2" && opponentPlay && opponent.roundPlays.length && opponent.roundPlays.at(-1)!.position !== opponentPlay.position) {
    power += 2; notes.push("+2 rival cambia de posición");
  } else if (card.effect === "third2" && state.turn === 3) {
    power += 2; notes.push("+2 tercer duelo");
  }

  if (
    self.champion.id === "vinira" &&
    !self.viniraUsed &&
    card.affinity &&
    play.position !== card.affinity &&
    affinity
  ) {
    power += 1;
    notes.push("+1 Vinira fuera de afinidad");
  }

  return power;
}

export function previewOpeningPower(
  state: GameState,
  play: EnginePlay,
  self: PlayerState,
  opponent: PlayerState
) {
  const affinity = affinityActive(self, play.card, play.position);
  const notes = [`Base ${play.card.power}`];
  const opponentDependent = new Set([
    "enemy_printed6_2",
    "copy_plus2",
    "opposite_enemy2",
    "enemy_affinity2",
    "enemy_repeat2",
    "enemy_change2"
  ]).has(play.card.effect);
  const power = intrinsicPower(state, play, self, opponent, null, affinity, notes);
  const exact = !opponentDependent && !(self.champion.id === "santo_simetrico" && !self.saintPassiveUsed);
  return { power, exact, notes };
}

export function calculateDuel(
  state: GameState,
  playerPlay: EnginePlay,
  opponentPlay: EnginePlay
): DuelPowerResult {
  const A = state.player;
  const B = state.opponent;
  let playerAffinity = affinityActive(A, playerPlay.card, playerPlay.position);
  let opponentAffinity = affinityActive(B, opponentPlay.card, opponentPlay.position);
  const playerNotes = [`Base ${playerPlay.card.power}`];
  const opponentNotes = [`Base ${opponentPlay.card.power}`];

  const playerCancel = playerPlay.card.effect === "cancel_enemy_affinity" && playerAffinity;
  const opponentCancel = opponentPlay.card.effect === "cancel_enemy_affinity" && opponentAffinity;
  if (opponentCancel && playerAffinity) {
    playerAffinity = false;
    playerNotes.push("Habilidad de posición anulada por Sabio");
  }
  if (playerCancel && opponentAffinity) {
    opponentAffinity = false;
    opponentNotes.push("Habilidad de posición anulada por Sabio");
  }

  let player = intrinsicPower(state, playerPlay, A, B, opponentPlay, playerAffinity, playerNotes);
  let opponent = intrinsicPower(state, opponentPlay, B, A, playerPlay, opponentAffinity, opponentNotes);

  if (playerPlay.card.effect === "enemy3" && playerAffinity) {
    opponent -= 3; opponentNotes.push("−3 Asesino sinistral");
  }
  if (opponentPlay.card.effect === "enemy3" && opponentAffinity) {
    player -= 3; playerNotes.push("−3 Asesino sinistral");
  }
  if (playerPlay.card.effect === "lost_prev_enemy3" && playerAffinity && A.duelResults.at(-1) === "loss") {
    opponent -= 3; opponentNotes.push("−3 Protector");
  }
  if (opponentPlay.card.effect === "lost_prev_enemy3" && opponentAffinity && B.duelResults.at(-1) === "loss") {
    player -= 3; playerNotes.push("−3 Protector");
  }
  if (playerPlay.card.effect === "enemy_boosted_minus2" && playerAffinity && opponent > opponentPlay.card.power) {
    opponent -= 2; opponentNotes.push("−2 Desencantador");
  }
  if (opponentPlay.card.effect === "enemy_boosted_minus2" && opponentAffinity && player > playerPlay.card.power) {
    player -= 2; playerNotes.push("−2 Desencantador");
  }
  if (playerPlay.card.effect === "prev_draw_enemy3" && playerAffinity && A.duelResults.at(-1) === "draw") {
    opponent -= 3; opponentNotes.push("−3 Tejedor de sombras");
  }
  if (opponentPlay.card.effect === "prev_draw_enemy3" && opponentAffinity && B.duelResults.at(-1) === "draw") {
    player -= 3; playerNotes.push("−3 Tejedor de sombras");
  }

  let playerSaintTriggered = false;
  let opponentSaintTriggered = false;
  if (A.champion.id === "santo_simetrico" && !A.saintPassiveUsed && player === opponent - 1) {
    player += 1; playerNotes.push("+1 Santo Simétrico → empate"); playerSaintTriggered = true;
  } else if (B.champion.id === "santo_simetrico" && !B.saintPassiveUsed && opponent === player - 1) {
    opponent += 1; opponentNotes.push("+1 Santo Simétrico → empate"); opponentSaintTriggered = true;
  }

  return {
    player, opponent,
    playerAffinity, opponentAffinity,
    playerNotes, opponentNotes,
    playerSaintTriggered, opponentSaintTriggered
  };
}
