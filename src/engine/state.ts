import { cardsByFaction } from "../data";
import type { CardDefinition, Faction, Position } from "../types";
import { champions } from "./champions";
import type { GameState, PlayerState, Side } from "./types";

const emptyArchives = (): Record<Position, CardDefinition[]> => ({
  siniestra: [], trono: [], diestra: []
});

export function shuffle<T>(items: T[], rng:()=>number=Math.random) {
  const copy = [...items];
  for (let i=copy.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

export function makeDeck(faction: Faction, rng:()=>number=Math.random) {
  const deck: CardDefinition[] = [];
  for (const card of cardsByFaction[faction]) {
    deck.push(card,card);
  }
  return shuffle(deck,rng);
}

export function createPlayer(championId: string, rng:()=>number=Math.random): PlayerState {
  const champion = champions[championId];
  if (!champion) throw new Error(`Unknown champion: ${championId}`);
  return {
    champion,
    life: champion.life,
    deck: makeDeck(champion.faction,rng),
    hand: [],
    archives: emptyArchives(),
    discard: [],
    roundPlays: [],
    duelResults: [],
    nextBuff: 0,
    nextBuffNotes: [],
    incomingDebuff: 0,
    incomingNotes: [],
    nextPositionBoost: 0,
    nextPositionSpecificBoost: null,
    bluePassiveUsed: false,
    empireanBuff: 0,
    nextBaseDouble: false,
    saintPassiveUsed: false,
    athosDiestraCapacity: 1,
    viniraUsed: false,
    lastAuguryResult: null,
    auguryHitsTotal: 0,
    healedLife: 0,
    auguryHitsSinceHeal: 0,
    auguryHeals: 0,
    cycles: 0
  };
}

export function resetRoundPlayer(player: PlayerState, rng:()=>number=Math.random) {
  if (player.deck.length < 3) {
    player.deck = makeDeck(player.champion.faction,rng);
    player.cycles += 1;
  }
  player.hand = player.deck.splice(0,3);
  player.roundPlays = [];
  player.duelResults = [];
  player.nextBuff = 0;
  player.nextBuffNotes = [];
  player.incomingDebuff = 0;
  player.incomingNotes = [];
  player.nextPositionBoost = 0;
  player.nextPositionSpecificBoost = null;
  player.bluePassiveUsed = false;
  player.empireanBuff = 0;
  player.nextBaseDouble = false;
  player.saintPassiveUsed = false;
  player.athosDiestraCapacity = 1;
  player.viniraUsed = false;
}

export function createGame(
  playerChampion="dextral",
  opponentChampion="athos",
  rng:()=>number=Math.random,
  forcedStarter?: Side
): GameState {
  const starter = forcedStarter ?? (rng()<.5?"player":"opponent");
  const state: GameState = {
    round: 1,
    turn: 1,
    roundStarter: starter,
    initiative: starter,
    phase: "awaiting_player",
    duelScore: {player:0,opponent:0},
    player: createPlayer(playerChampion,rng),
    opponent: createPlayer(opponentChampion,rng),
    pendingPlayerPlay: null,
    pendingOpponentPlay: null,
    lastDuel: null,
    rounds: [],
    events: [{text:`Comienza la partida: ${champions[playerChampion].name} vs ${champions[opponentChampion].name}.`,kind:"info"}]
  };
  resetRoundPlayer(state.player,rng);
  resetRoundPlayer(state.opponent,rng);
  return state;
}
