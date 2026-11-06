import { positionLabels } from "../data";
import type { DuelResult, Position } from "../types";
import { aiWantsQuiero, chooseAIPlay } from "./ai";
import { affinityActive, calculateDuel, legalPositions, previewOpeningPower } from "./rules";
import { createGame, resetRoundPlayer } from "./state";
import type { DeckDefinition } from "./decks";
import type { AIDifficulty, EnginePlay, GameState, PlayerState, Side } from "./types";

function addBuff(player: PlayerState, amount: number, label: string) {
  player.nextBuff += amount;
  player.nextBuffNotes.push(`+${amount} ${label}`);
}

function addDebuff(player: PlayerState, amount: number, label: string) {
  player.incomingDebuff += amount;
  player.incomingNotes.push(`−${amount} ${label}`);
}

// Augurio v2 resolves in the same duel. No queued bonuses or predictions.
export function isAuguryEffect(effect: string) {
  return effect === "augury_match3";
}

export function recordAugury(
  state: GameState,
  owner: PlayerState,
  play: EnginePlay,
  rivalPlay: EnginePlay
) {
  if (!isAuguryEffect(play.card.effect)) return;
  const hit = play.position === rivalPlay.position;
  owner.lastAuguryResult = hit ? "hit" : "miss";
  if (hit) {
    owner.auguryHitsTotal += 1;
    if (owner.champion.id === "prioresa_luna_llena") owner.auguryHitsSinceHeal += 1;
  }
  state.events.push({
    text:`Augurio · ${play.card.name}: ${hit ? "acierto (+3 Poder en este duelo)" : "fallo (sin bonificación)"}.`,
    kind:"info"
  });
}

function applyPrioryHealing(state: GameState, player: PlayerState) {
  if (player.champion.id !== "prioresa_luna_llena") return;
  while (
    player.auguryHitsSinceHeal >= 3 &&
    player.auguryHeals < 2 &&
    player.life < player.champion.life
  ) {
    player.auguryHitsSinceHeal -= 3;
    player.auguryHeals += 1;
    player.life = Math.min(player.champion.life, player.life + 1);
    player.healedLife = Math.min(player.life, player.healedLife + 1);
    state.events.push({
      text:`Prioresa de la Luna Llena recupera 1 Vida (${player.auguryHeals}/2).`,
      kind:"info"
    });
  }
}

function scoreFor(state: GameState, player: PlayerState): [number,number] {
  return player === state.player
    ? [state.duelScore.player,state.duelScore.opponent]
    : [state.duelScore.opponent,state.duelScore.player];
}

export function applyPost(
  state: GameState,
  self: PlayerState,
  play: EnginePlay,
  result: DuelResult,
  opponent: PlayerState,
  affinity: boolean
) {
  if (play.card.effect === "loss_next3" && result === "loss") addBuff(self,3,"Mensajero extraño");
  // Preserves v0.8.7 LAB behavior: current duel result is already in duelResults here.
  if (play.card.effect === "won_round_next3" && self.duelResults.includes("win")) addBuff(self,3,"Asesor real");
  if (play.card.effect === "next_position2" && affinity) self.nextPositionBoost = 2;
  if (play.card.effect === "next_diestra2") self.nextPositionSpecificBoost = {position:"diestra",amount:2,source:"Abanderado real"};
  if (play.card.effect === "enemy_next3" && affinity) addDebuff(opponent,3,"Oráculo");
  if (play.card.effect === "mirror_martyr") {
    const [own,rival] = scoreFor(state,self);
    if (own===1 && rival===1) self.nextBaseDouble = true;
  }
}

function consumePreparedState(state: GameState, playerPlay: EnginePlay, opponentPlay: EnginePlay) {
  const playerSpecificUsed = state.player.nextPositionSpecificBoost?.position === playerPlay.position;
  const opponentSpecificUsed = state.opponent.nextPositionSpecificBoost?.position === opponentPlay.position;
  for (const player of [state.player,state.opponent]) {
    player.nextBuff = 0;
    player.nextBuffNotes = [];
    player.incomingDebuff = 0;
    player.incomingNotes = [];
    player.nextPositionBoost = 0;
    player.empireanBuff = 0;
    player.nextBaseDouble = false;
  }
  if (playerSpecificUsed) state.player.nextPositionSpecificBoost = null;
  if (opponentSpecificUsed) state.opponent.nextPositionSpecificBoost = null;
}

function beginDuel(state: GameState, rng:()=>number) {
  if (state.phase === "finished") return;
  state.phase = "awaiting_player";
  state.pendingPlayerPlay = null;
  state.pendingOpponentPlay = null;
  if (state.initiative === "opponent" && state.mode !== "pvp") {
    const choice = chooseAIPlay(state,null,true,rng);
    const [card] = state.opponent.hand.splice(choice.handIndex!,1);
    const staged: EnginePlay = {...choice,card};
    const preview = previewOpeningPower(state,staged,state.opponent,state.player);
    staged.finalPower = preview.power;
    staged.powerExact = preview.exact;
    staged.notes = preview.notes;
    state.pendingOpponentPlay = staged;
    state.events.push({
      text:`La IA abre con ${card.name} en ${positionLabels[choice.position]}${preview.exact?` · Poder ${preview.power}`:" · Poder pendiente"}.`,
      kind:"info"
    });
  }
}

export function startGame(
  playerChampion="dextral",
  opponentChampion="athos",
  rng:()=>number=Math.random,
  forcedStarter?: Side,
  difficulty: AIDifficulty = "normal",
  decks?:{player?:DeckDefinition;opponent?:DeckDefinition}
) {
  const state=createGame(playerChampion,opponentChampion,rng,forcedStarter,decks);
  state.aiDifficulty=difficulty;
  beginDuel(state,rng);
  return state;
}

function finishGame(state: GameState) {
  state.phase = "finished";
  state.winner = state.player.life>state.opponent.life
    ? "player"
    : state.opponent.life>state.player.life
      ? "opponent"
      : "draw";
  state.endReason = "vida";
  state.pendingPlayerPlay = null;
  state.pendingOpponentPlay = null;
  state.events.push({
    text: state.winner==="player" ? "Ganaste la partida." : state.winner==="opponent" ? "Ganó la IA." : "La partida terminó en empate.",
    kind:"info"
  });
}

function endRound(
  state: GameState,
  reason: "completed" | "player_no_quiero" | "opponent_no_quiero",
  rng:()=>number
) {
  // This is deliberately computed before moving/clearing round state, then restored
  // after resetRoundPlayer so Señor de los Archivos actually reaches the next card.
  const playerEmpireanNext =
    state.player.champion.id==="empireos" &&
    new Set(state.opponent.roundPlays.map(play=>play.position)).size===3;
  const opponentEmpireanNext =
    state.opponent.champion.id==="empireos" &&
    new Set(state.player.roundPlays.map(play=>play.position)).size===3;

  for (const player of [state.player,state.opponent]) {
    player.roundPlays.forEach(play=>player.archives[play.position].push(play.card));
    while (player.hand.length) player.discard.push(player.hand.pop()!);
  }

  state.rounds.push({
    round:state.round,
    score:{...state.duelScore},
    reason,
    playerLife:state.player.life,
    opponentLife:state.opponent.life,
    starter:state.roundStarter
  });
  state.events.push({
    text:`Fin de ronda ${state.round}: ${state.duelScore.player}–${state.duelScore.opponent}${reason==="player_no_quiero"?" · No quiero":reason==="opponent_no_quiero"?" · IA dijo No quiero":""}.`,
    kind:"round"
  });

  state.round += 1;
  state.roundStarter = state.roundStarter==="player" ? "opponent" : "player";
  state.initiative = state.roundStarter;
  state.duelScore = {player:0,opponent:0};
  state.turn = 1;
  state.pendingPlayerPlay = null;
  state.pendingOpponentPlay = null;

  resetRoundPlayer(state.player,rng);
  resetRoundPlayer(state.opponent,rng);
  if (playerEmpireanNext) state.player.empireanBuff = 2;
  if (opponentEmpireanNext) state.opponent.empireanBuff = 2;

  beginDuel(state,rng);
}

function resolvePendingDuel(state: GameState, rng:()=>number) {
  const playerPlay=state.pendingPlayerPlay;
  const opponentPlay=state.pendingOpponentPlay;
  if (!playerPlay || !opponentPlay) throw new Error("Both plays are required to resolve a duel.");

  const power=calculateDuel(state,playerPlay,opponentPlay);
  consumePreparedState(state,playerPlay,opponentPlay);

  if (power.playerSaintTriggered) state.player.saintPassiveUsed=true;
  if (power.opponentSaintTriggered) state.opponent.saintPassiveUsed=true;

  playerPlay.finalPower=power.player;
  playerPlay.notes=power.playerNotes;
  opponentPlay.finalPower=power.opponent;
  opponentPlay.notes=power.opponentNotes;

  if (playerPlay.card.effect==="clear_archive2x") state.player.archives[playerPlay.position]=[];
  if (opponentPlay.card.effect==="clear_archive2x") state.opponent.archives[opponentPlay.position]=[];

  state.player.roundPlays.push(playerPlay);
  state.opponent.roundPlays.push(opponentPlay);

  let outcome: Side | "draw"="draw";
  if (power.player>power.opponent) {
    outcome="player";
    state.duelScore.player += 1;
    state.opponent.life -= 1;
    state.opponent.healedLife = Math.max(0,state.opponent.healedLife - 1);
    state.player.duelResults.push("win");
    state.opponent.duelResults.push("loss");
  } else if (power.opponent>power.player) {
    outcome="opponent";
    state.duelScore.opponent += 1;
    state.player.life -= 1;
    state.player.healedLife = Math.max(0,state.player.healedLife - 1);
    state.player.duelResults.push("loss");
    state.opponent.duelResults.push("win");
  } else {
    state.player.duelResults.push("draw");
    state.opponent.duelResults.push("draw");
  }

  applyPost(state,state.player,playerPlay,outcome==="player"?"win":outcome==="opponent"?"loss":"draw",state.opponent,power.playerAffinity);
  applyPost(state,state.opponent,opponentPlay,outcome==="opponent"?"win":outcome==="player"?"loss":"draw",state.player,power.opponentAffinity);

  if (state.player.champion.id==="vinira"&&!state.player.viniraUsed&&playerPlay.card.affinity&&playerPlay.position!==playerPlay.card.affinity) state.player.viniraUsed=true;
  if (state.opponent.champion.id==="vinira"&&!state.opponent.viniraUsed&&opponentPlay.card.affinity&&opponentPlay.position!==opponentPlay.card.affinity) state.opponent.viniraUsed=true;

  if (outcome==="player"&&state.player.champion.id==="athos"&&playerPlay.position==="diestra") {
    state.player.athosDiestraCapacity=Math.min(3,state.player.athosDiestraCapacity+1);
  }
  if (outcome==="opponent"&&state.opponent.champion.id==="athos"&&opponentPlay.position==="diestra") {
    state.opponent.athosDiestraCapacity=Math.min(3,state.opponent.athosDiestraCapacity+1);
  }

  if (outcome==="opponent"&&state.player.champion.id==="sinistral"&&!state.player.bluePassiveUsed) {
    addDebuff(state.opponent,2,"Vor Calasta");
    state.player.bluePassiveUsed=true;
  }
  if (outcome==="player"&&state.opponent.champion.id==="sinistral"&&!state.opponent.bluePassiveUsed) {
    addDebuff(state.player,2,"Vor Calasta");
    state.opponent.bluePassiveUsed=true;
  }

  if (outcome==="draw"&&state.player.champion.id==="samas") addBuff(state.player,2,"Samas");
  if (outcome==="draw"&&state.opponent.champion.id==="samas") addBuff(state.opponent,2,"Samas");

  // Resolve same-duel Augurios only after the Power calculation and damage.
  // Both Champions record their own Augurio independently of who wins the duel.
  recordAugury(state,state.player,playerPlay,opponentPlay);
  recordAugury(state,state.opponent,opponentPlay,playerPlay);
  applyPrioryHealing(state,state.player);
  applyPrioryHealing(state,state.opponent);

  if (outcome==="player") state.initiative="player";
  else if (outcome==="opponent") state.initiative="opponent";

  state.lastDuel={
    turn:state.turn,
    outcome,
    playerPlay:{...playerPlay},
    opponentPlay:{...opponentPlay}
  };
  state.events.push({
    text:`Duelo ${state.turn}: ${playerPlay.card.name} (${power.player}) vs ${opponentPlay.card.name} (${power.opponent}) → ${outcome==="draw"?"Empate":outcome==="player"?"Ganás vos":"Gana la IA"}.`,
    kind:"duel"
  });
  state.pendingPlayerPlay=null;
  state.pendingOpponentPlay=null;

  if (state.player.life<=0 || state.opponent.life<=0) {
    finishGame(state);
    return;
  }

  if (state.turn===2 && (state.duelScore.player===2 || state.duelScore.opponent===2)) {
    if (state.mode === "pvp") {
      state.phase="awaiting_quiero";
      state.events.push({text:"El jugador que perdió los dos primeros duelos decide Quiero o No quiero.",kind:"decision"});
      return;
    }
    if (state.duelScore.opponent===2) {
      state.phase="awaiting_quiero";
      state.events.push({text:"Vas 0–2. Elegí Quiero o No quiero.",kind:"decision"});
      return;
    }
    const wants=aiWantsQuiero(state,rng);
    state.events.push({text:`IA: ${wants?"Quiero":"No quiero"}.`,kind:"decision"});
    if (!wants) {
      endRound(state,"opponent_no_quiero",rng);
      return;
    }
    state.turn=3;
    beginDuel(state,rng);
    return;
  }

  if (state.turn===3) {
    endRound(state,"completed",rng);
    return;
  }

  state.turn=(state.turn+1) as 1|2|3;
  beginDuel(state,rng);
}

export function submitPlayerPlay(
  state: GameState,
  handIndex: number,
  position: Position,
  rng:()=>number=Math.random
) {
  if (state.phase!=="awaiting_player") return;
  if (!legalPositions(state.player).includes(position)) return;
  const card=state.player.hand[handIndex];
  if (!card) return;

  const [chosen]=state.player.hand.splice(handIndex,1);
  state.pendingPlayerPlay={card:chosen,position};


  if (state.initiative==="player") {
    const aiChoice=chooseAIPlay(state,state.pendingPlayerPlay,false,rng);
    const [aiCard]=state.opponent.hand.splice(aiChoice.handIndex!,1);
    state.pendingOpponentPlay={...aiChoice,card:aiCard};
  } else if (!state.pendingOpponentPlay) {
    throw new Error("Opponent initiative requires a staged AI play.");
  }

  resolvePendingDuel(state,rng);
}

export function answerQuiero(state: GameState, wants: boolean, rng:()=>number=Math.random) {
  if (state.phase!=="awaiting_quiero") return;
  state.events.push({text:`Vos: ${wants?"Quiero":"No quiero"}.`,kind:"decision"});
  if (!wants) {
    endRound(state,"player_no_quiero",rng);
    return;
  }
  state.turn=3;
  beginDuel(state,rng);
}

export function cloneGame(state: GameState): GameState {
  return structuredClone(state);
}

/**
 * PvP lives on the authoritative room server. These functions never call AI,
 * and reject out-of-turn and illegal commands before changing game state.
 * The two seats are the host ("player") and guest ("opponent").
 */
export function startPvpGame(
  hostChampion: string,
  guestChampion: string,
  rng:()=>number=Math.random,
  forcedStarter?:Side
):GameState {
  const state=createGame(hostChampion,guestChampion,rng,forcedStarter);
  state.mode="pvp";
  beginDuel(state,rng);
  return state;
}

export function nextHumanSide(state:GameState):Side|null {
  if(state.mode!=="pvp" || state.phase!=="awaiting_player")return null;
  if(state.pendingPlayerPlay && state.pendingOpponentPlay)return null;
  if(state.pendingPlayerPlay)return "opponent";
  if(state.pendingOpponentPlay)return "player";
  return state.initiative;
}

export function submitHumanPlay(
  state:GameState,
  side:Side,
  handIndex:number,
  position:Position,
  rng:()=>number=Math.random
):void {
  if(state.mode!=="pvp")throw new Error("La sala no es PvP.");
  if(nextHumanSide(state)!==side)throw new Error("No es tu turno.");
  if(!Number.isInteger(handIndex))throw new Error("Índice de carta inválido.");
  const owner=side==="player"?state.player:state.opponent;
  const rival=side==="player"?state.opponent:state.player;
  if(!legalPositions(owner).includes(position))throw new Error("Posición ocupada.");
  if(handIndex<0 || handIndex>=owner.hand.length)throw new Error("Carta inexistente.");
  const [card]=owner.hand.splice(handIndex,1);
  const staged:EnginePlay={card,position};
  const isOpening=state.pendingPlayerPlay===null && state.pendingOpponentPlay===null;
  if(isOpening){
    const opening=previewOpeningPower(state,staged,owner,rival);
    staged.finalPower=opening.power;
    staged.powerExact=opening.exact;
    staged.notes=opening.notes;
  }
  if(side==="player")state.pendingPlayerPlay=staged;
  else state.pendingOpponentPlay=staged;
  state.events.push({text:`${owner.champion.name.split(",")[0]} jugó ${card.name} en ${positionLabels[position]}.`,kind:"info"});
  if(state.pendingPlayerPlay && state.pendingOpponentPlay)resolvePendingDuel(state,rng);
}

export function nextHumanQuieroSide(state:GameState):Side|null {
  if(state.mode!=="pvp" || state.phase!=="awaiting_quiero")return null;
  return state.duelScore.player===0?"player":"opponent";
}

export function submitHumanQuiero(
  state:GameState,
  side:Side,
  wants:boolean,
  rng:()=>number=Math.random
):void {
  if(nextHumanQuieroSide(state)!==side)throw new Error("La decisión Quiero no te corresponde.");
  state.events.push({text:`${side==="player"?"Anfitrión":"Invitado"}: ${wants?"Quiero":"No quiero"}.`,kind:"decision"});
  if(!wants){
    endRound(state,side==="player"?"player_no_quiero":"opponent_no_quiero",rng);
    return;
  }
  state.turn=3;
  beginDuel(state,rng);
}
