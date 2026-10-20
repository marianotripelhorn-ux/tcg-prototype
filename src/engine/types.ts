import type { CardDefinition, ChampionDefinition, DuelResult, PlayedCard, Position } from "../types";

export interface EnginePlay extends PlayedCard {
  position: Position;
}

export interface PreparedPositionBoost {
  position: Position;
  amount: number;
  source: string;
}

export interface PlayerState {
  champion: ChampionDefinition;
  life: number;
  hand: CardDefinition[];
  deck: CardDefinition[];
  archives: Record<Position, CardDefinition[]>;
  discard: CardDefinition[];
  roundPlays: EnginePlay[];
  duelResults: DuelResult[];
  nextBuff: number;
  nextBuffNotes: string[];
  incomingDebuff: number;
  incomingNotes: string[];
  nextPositionBoost: number;
  nextPositionSpecificBoost: PreparedPositionBoost | null;
  bluePassiveUsed: boolean;
  empireanBuff: number;
  nextBaseDouble: boolean;
  saintPassiveUsed: boolean;
  athosDiestraCapacity: number;
  viniraUsed: boolean;
}

export interface GameState {
  turn: 1 | 2 | 3;
  duelScore: { player: number; opponent: number };
  player: PlayerState;
  opponent: PlayerState;
}

export interface DuelPowerResult {
  player: number;
  opponent: number;
  playerAffinity: boolean;
  opponentAffinity: boolean;
  playerNotes: string[];
  opponentNotes: string[];
  playerSaintTriggered: boolean;
  opponentSaintTriggered: boolean;
}
