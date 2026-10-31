import { positions } from "../data";
import type { CardDefinition, Position } from "../types";
import { affinityActive, calculateDuel, capacity, countPosition, legalPositions } from "./rules";
import type { EnginePlay, GameState, PlayerState } from "./types";

function roundScoreFor(state: GameState, player: PlayerState): [number, number] {
  return player === state.player
    ? [state.duelScore.player, state.duelScore.opponent]
    : [state.duelScore.opponent, state.duelScore.player];
}

function isOppositeLateral(a: Position, b: Position) {
  return (a === "siniestra" && b === "diestra") || (a === "diestra" && b === "siniestra");
}

function opponentLife(state: GameState, player: PlayerState) {
  return player === state.player ? state.opponent.life : state.player.life;
}

function doubleCount(state: GameState, player: PlayerState, card: CardDefinition) {
  let n = player.nextBaseDouble ? 1 : 0;
  if (card.effect === "second_trono_double" && state.turn === 3 && player.roundPlays[1]?.position === "trono") n++;
  if (card.effect === "equal_life_double" && player.life === opponentLife(state, player)) n++;
  return n;
}

export function estimateOwn(
  state: GameState,
  card: CardDefinition,
  pos: Position,
  player: PlayerState,
  opponent: PlayerState
) {
  const aff = affinityActive(player, card, pos);
  let value =
    card.power * (1 + doubleCount(state, player, card)) +
    player.nextBuff +
    player.auguryBuff +
    (player.nextPositionBoost && aff ? player.nextPositionBoost : 0) +
    (player.nextPositionSpecificBoost && pos === player.nextPositionSpecificBoost.position
      ? player.nextPositionSpecificBoost.amount : 0) +
    player.empireanBuff -
    player.incomingDebuff;

  if (card.effect === "bonus2" && aff) value += 2;
  if (card.effect === "first_or_prev_diestra2" && aff && (!player.roundPlays.length || player.roundPlays.at(-1)?.position === "diestra")) value += 2;
  if (card.effect === "won_prev2" && aff && player.duelResults.at(-1) === "win") value += 2;
  if (card.effect === "empty_sin5" && aff && countPosition(player, "siniestra") === 0 && pos !== "siniestra") value += 5;
  if (card.effect === "trono_before4" && aff && countPosition(player, "trono") > 0) value += 4;
  if (card.effect === "diestra_before3" && aff && countPosition(player, "diestra") > 0) value += 3;
  if (card.effect === "second_special3" && aff && countPosition(player, "diestra") > 0) value += 3;
  if (card.effect === "enemy_printed6_2" && aff) value += 1;
  if (card.effect === "copy_plus2" && aff) value = 7 + player.nextBuff + player.auguryBuff + (player.nextPositionBoost || 0) - player.incomingDebuff;
  if (card.effect === "third4" && aff && state.turn === 3) value += 4;
  if (card.effect === "archive_here") value += player.archives[pos].length;
  if (card.effect === "archive_empty2" && player.archives[pos].length === 0) value += 2;
  if (card.effect === "archive_two2" && player.archives[pos].length >= 2) value += 2;
  if (card.effect === "opp_archive_more2" && opponent.archives[pos].length > player.archives[pos].length) value += 2;
  if (card.effect === "archive_three6" && player.archives[pos].length >= 3) value += 6;
  if (card.effect === "trono_archive_three3" && aff && player.archives.trono.length >= 3) value += 3;
  if (card.effect === "least_archive2" && player.archives[pos].length === Math.min(...positions.map(p => player.archives[p].length))) value += 2;
  if (card.effect === "opp_archive_capped") value += Math.min(4, opponent.archives[pos].length);
  if (card.effect === "clear_archive2x") value += 2 * player.archives[pos].length;
  if (card.effect === "lateral1" && pos !== "trono") value += 1;
  if (card.effect === "losing_round2") { const [own,rival]=roundScoreFor(state,player); if (own<rival) value+=2; }
  if (card.effect === "score_tied1") { const [own,rival]=roundScoreFor(state,player); if (own===rival) value+=1; }
  if (card.effect === "axis_lateral2" && aff && player.roundPlays.some(p => p.position === "siniestra" || p.position === "diestra")) value += 2;
  if (card.effect === "opposite_prev3" && player.roundPlays.length && isOppositeLateral(player.roundPlays.at(-1)!.position,pos)) value += 3;
  if (card.effect === "first_round3" && !player.roundPlays.length) value += 3;
  if (card.effect === "winning_round2") { const [own,rival]=roundScoreFor(state,player); if (own>rival) value+=2; }
  if (card.effect === "enemy_affinity2" && aff) value += 1.2;
  if (card.effect === "prev_draw3" && player.duelResults.at(-1) === "draw") value += 3;
  if (card.effect === "win_loss4" && player.duelResults.includes("win") && player.duelResults.includes("loss")) value += 4;
  if (card.effect === "first_opposite3" && player.roundPlays.length && isOppositeLateral(player.roundPlays[0].position,pos)) value += 3;
  if (card.effect === "archive_leads_global") value += positions.filter(p => player.archives[p].length > opponent.archives[p].length).length;
  if (card.effect === "archive_exact2_5" && player.archives[pos].length === 2) value += 5;
  if (card.effect === "archive_all_diff3" && new Set(positions.map(p => player.archives[p].length)).size === 3) value += 3;
  if (card.effect === "last_augury_hit2" && player.lastAuguryResult === "hit") value += 2;
  if (card.effect === "lower_life2" && player.life < opponent.life) value += 2;
  if (card.effect === "last_augury_miss3" && player.lastAuguryResult === "miss") value += 3;
  if (card.effect === "third2" && state.turn === 3) value += 2;
  if (card.effect === "enemy_repeat2") value += opponent.roundPlays.length ? 1.1 : 0;
  if (card.effect === "enemy_change2") value += opponent.roundPlays.length ? 1.1 : 0;
  if (player.champion.id === "vinira" && !player.viniraUsed && card.affinity && pos !== card.affinity && aff) value += 1;
  return value;
}

function aiSetupScore(state: GameState, card: CardDefinition, pos: Position, player: PlayerState) {
  if (state.turn >= 3) return 0;
  let score = 0;
  const remaining = player.hand.filter(c => c !== card);
  if (card.effect === "won_round_next3" && player.duelResults.includes("win")) score += 2.3;
  if (card.effect === "next_position2" && affinityActive(player,card,pos)) score += 1.8;
  if (card.effect === "enemy_next3" && affinityActive(player,card,pos)) score += 1.7;
  if (card.effect === "loss_next3") score += 1.1;
  if (card.effect === "first_round3" && !player.roundPlays.length) score += 2.0;
  if (card.effect === "next_diestra2") score += 2.4;
  if (card.effect.startsWith("augury_")) {
    score += 1.25;
    if (player.champion.id === "prioresa_luna_llena" && player.auguryHitsSinceHeal === 2 && player.auguryHeals < 2) score += .65;
  }
  if (player.champion.id === "dextral" || player.champion.id === "athos") {
    if (pos === "diestra" && remaining.some(c => ["guardia_dextral","guardia_castillo","maestro_armas","caballero_tigre"].includes(c.id))) score += 1.2;
    if (pos === "trono" && remaining.some(c => c.id === "blazewalker")) score += 1.0;
    if (card.id === "maestro_armas" && countPosition(player,"diestra") > 0) score += 1.2;
    if (player.champion.id === "athos" && pos === "diestra" && state.turn < 3) score += 1.0;
  }
  if (player.champion.id === "santo_simetrico") {
    if (card.effect === "mirror_martyr" && state.turn === 2) score += 2.0;
    if (pos !== "trono" && remaining.some(c => ["paso_especular","palindromo","custodio_eje"].includes(c.id))) score += .9;
    if (card.effect === "prev_draw3" && player.duelResults.at(-1) === "draw") score += .8;
  }
  return score;
}

function aiPairSynergy(state: GameState, first: CardDefinition, firstPos: Position, next: CardDefinition, nextPos: Position, player: PlayerState) {
  let score = 0;
  if (first.effect === "next_diestra2" && nextPos === "diestra") score += 2.4;
  if (first.effect === "next_position2" && next.affinity && nextPos === next.affinity) score += 2.2;
  if (first.effect === "enemy_next3") score += 1.7;
  if (first.effect === "loss_next3") score += 1.5;
  if (first.effect === "won_round_next3" && player.duelResults.includes("win")) score += 2.0;
  if (firstPos === "diestra") {
    if (next.effect === "first_or_prev_diestra2" && nextPos === "diestra") score += 2.0;
    if (next.effect === "diestra_before3" && nextPos === "trono") score += 2.7;
    if (next.effect === "second_special3" && nextPos === "diestra") score += 3.1;
  }
  if (firstPos === "trono" && next.effect === "trono_before4" && nextPos === "siniestra") score += 3.2;
  if (isOppositeLateral(firstPos,nextPos) && next.effect === "opposite_prev3") score += 2.8;
  if (next.effect === "axis_lateral2" && nextPos === "trono" && (firstPos === "siniestra" || firstPos === "diestra")) score += 2.0;
  if (next.effect === "first_opposite3" && isOppositeLateral(firstPos,nextPos)) score += 2.5;
  if (state.turn === 1 && next.effect === "second_trono_double" && nextPos === "trono") score += 1.4;
  return score;
}

function reserveValue(state: GameState, card: CardDefinition, player: PlayerState) {
  let value = 0;
  if (state.turn < 3) {
    if (card.effect === "third4") value += 3;
    if (card.effect === "second_special3" && countPosition(player,"diestra") === 0) value += 1.8;
    if (card.effect === "win_loss4") value += 1.7;
    if (card.effect === "second_trono_double") value += 1.5;
    if (card.effect === "first_opposite3") value += 1;
    if (card.effect === "prev_draw3" && player.duelResults.at(-1) !== "draw") value += .8;
  }
  return value;
}

function handPlanScore(state: GameState, card: CardDefinition, pos: Position, player: PlayerState, opponent: PlayerState, opening: boolean) {
  if (state.turn >= 3 || player.hand.length <= 1) return 0;
  const remaining = player.hand.filter(c => c !== card);
  let bestNext = 0;
  for (const next of remaining) {
    for (const nextPos of legalPositions(player)) {
      if (nextPos === pos && capacity(player,pos) <= countPosition(player,pos)+1) continue;
      let candidate = aiPairSynergy(state,card,pos,next,nextPos,player);
      candidate += Math.max(0,estimateOwn(state,next,nextPos,player,opponent)-5)*.18;
      bestNext = Math.max(bestNext,candidate);
    }
  }
  let score = bestNext - reserveValue(state,card,player);
  if (opening && state.turn === 1) {
    const current = estimateOwn(state,card,pos,player,opponent);
    if (current >= 7) score += .8;
    if (current <= 4) score -= 1;
  }
  return score;
}

// The difficult AI only uses the player's public, announced Augurios.
// It must never inspect the player's hand or the unrevealed deck.
function hitsPublicAugury(state: GameState, card: CardDefinition, position: Position) {
  return state.player.pendingAuguries.some(augury => {
    switch (augury.effect) {
      case "augury_same_position":
        return position === augury.sourcePosition;
      case "augury_printed6":
        return card.power >= 6;
      case "augury_trono":
        return position === "trono";
      case "augury_opposite_lateral":
        return isOppositeLateral(position,augury.sourcePosition);
      case "augury_repeated_position":
        return state.opponent.roundPlays.some(play => play.position === position);
      case "augury_enemy_affinity":
        return !!card.affinity;
      default:
        return false;
    }
  });
}

export function chooseAIPlay(state: GameState, firstPlay: EnginePlay | null, aiFirst: boolean, rng:()=>number=Math.random): EnginePlay {
  const difficulty=state.aiDifficulty ?? "normal";
  // Apprentice AI makes exploratory legal moves instead of always searching
  // for the optimal response. Normal and hard preserve deterministic heuristics.
  if (difficulty === "easy" && rng() < .78) {
    const candidates = state.opponent.hand.flatMap((card,handIndex) =>
      legalPositions(state.opponent).map(position => ({card,position,handIndex}))
    );
    if (candidates.length === 0) throw new Error("AI has no legal play.");
    return candidates[Math.floor(rng()*candidates.length)];
  }

  let best: EnginePlay | null = null;
  state.opponent.hand.forEach((card, handIndex) => {
    legalPositions(state.opponent).forEach(position => {
      const play: EnginePlay = {card,position,handIndex};
      const setup = aiSetupScore(state,card,position,state.opponent);
      const plan = handPlanScore(state,card,position,state.opponent,state.player,aiFirst || !firstPlay);
      let score: number;
      if (aiFirst || !firstPlay) {
        const immediate = estimateOwn(state,card,position,state.opponent,state.player);
        score = immediate + setup + plan - card.power*.05;
        if (state.player.life === 1) score += immediate*.9;
        if (state.turn === 3) score += immediate*.55;
        score += rng()*.05;
      } else {
        const duel = calculateDuel(state,firstPlay,play);
        const mine = duel.opponent;
        const rival = duel.player;
        if (mine > rival) {
          score = 100 + setup + plan - card.power*.28 - Math.max(0,mine-rival)*.55;
          if (state.player.life === 1) score += 120;
          if (state.turn === 2) score += 16;
          if (state.turn === 3) score += 22;
          if (state.opponent.champion.id === "athos" && position === "diestra" && state.turn < 3) score += 4;
        } else if (mine === rival) {
          score = 44 + setup + plan - card.power*.20;
          if (state.opponent.life === 1) score += 45;
          if (state.turn === 3) score += 8;
          if (state.opponent.champion.id === "samas" && state.turn < 3) score += 4;
        } else {
          score = setup + plan - card.power*.38;
          if (card.effect === "loss_next3" && state.turn < 3) score += 5;
          if (card.effect === "mirror_martyr" && state.turn === 2) {
            const [own,rivalScore]=roundScoreFor(state,state.opponent);
            if (own === 1 && rivalScore === 0) score += 5;
          }
          if (state.turn === 2 && state.duelScore.opponent === 0 && state.duelScore.player === 1) score -= 12;
          if (state.opponent.life === 1) score -= 75;
        }
        score += rng()*.04;
      }
      if (difficulty === "hard") {
        // Prioritize multi-card plans. Do not sacrifice a winning reply only
        // to deny an Augurio: response scores have a 100-point win tier.
        score += setup*.35 + plan*.48;
        if (state.turn < 3 && reserveValue(state,card,state.opponent) > 0) {
          score -= reserveValue(state,card,state.opponent)*.4;
        }
        if (hitsPublicAugury(state,card,position)) {
          score -= 7;
        }
      }
      if (!best || score > (best.score ?? -Infinity)) {
        best = {...play,score,planScore:+plan.toFixed(2)};
      }
    });
  });
  if (!best) throw new Error("AI has no legal play.");
  return best;
}

export function aiWantsQuiero(state: GameState, rng:()=>number=Math.random) {
  let best = -99;
  state.opponent.hand.forEach(card => legalPositions(state.opponent).forEach(pos => {
    best = Math.max(best,estimateOwn(state,card,pos,state.opponent,state.player));
  }));
  const expectedRival = 5.8 + state.player.nextBuff + (state.player.empireanBuff || 0) - state.player.incomingDebuff;
  const canThreaten = best >= expectedRival - .3;
  const strongThreat = best >= expectedRival + 1.5;
  let wants = canThreaten;
  if (state.player.life <= 2 && best >= 4.5) wants = true;
  if (state.opponent.life === 1) wants = strongThreat;
  if (state.opponent.life >= 5 && best >= 6.5) wants = true;
  if (state.opponent.life <= 3 && best < expectedRival) wants = false;
  if (state.aiDifficulty === "easy") {
    // Occasionally accept a risky third duel or concede a promising one.
    if (rng() < .3) wants = !wants;
  }
  if (state.aiDifficulty === "hard") {
    // Better protect a match point while pressing a realistic finishing chance.
    if (state.opponent.life <= 2 && best < expectedRival + 1.0) wants = false;
    if (state.player.life === 1 && best >= expectedRival - 1) wants = true;
  }
  return wants;
}
