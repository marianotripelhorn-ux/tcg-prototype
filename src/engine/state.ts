import { cardsByFaction } from "../data";
import type { CardDefinition, Position } from "../types";
import { champions } from "./champions";
import type { GameState, PlayerState } from "./types";

const emptyArchives = (): Record<Position, CardDefinition[]> => ({
  siniestra: [], trono: [], diestra: []
});

export function createPlayer(championId: string): PlayerState {
  const champion = champions[championId];
  if (!champion) throw new Error(`Unknown champion: ${championId}`);
  return {
    champion,
    life: champion.life,
    deck: [...cardsByFaction[champion.faction], ...cardsByFaction[champion.faction]],
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
    viniraUsed: false
  };
}

export function createGame(playerChampion="dextral", opponentChampion="athos"): GameState {
  return {
    turn: 1,
    duelScore: { player: 0, opponent: 0 },
    player: createPlayer(playerChampion),
    opponent: createPlayer(opponentChampion)
  };
}
