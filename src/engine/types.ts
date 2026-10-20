import type { CardDefinition, ChampionDefinition, DuelResult, PlayedCard, Position } from "../types";

export type Side = "player" | "opponent";
export type GamePhase = "awaiting_player" | "awaiting_quiero" | "finished";

export interface EnginePlay extends PlayedCard {
  position: Position;
  handIndex?: number;
  score?: number;
  planScore?: number;
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
  cycles: number;
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

export interface DuelSummary {
  turn: number;
  outcome: Side | "draw";
  playerPlay: EnginePlay;
  opponentPlay: EnginePlay;
}

export interface RoundSummary {
  round: number;
  score: { player: number; opponent: number };
  reason: "completed" | "player_no_quiero" | "opponent_no_quiero";
  playerLife: number;
  opponentLife: number;
  starter: Side;
}

export interface GameEvent {
  text: string;
  kind?: "info" | "duel" | "round" | "decision";
}

export interface GameState {
  round: number;
  turn: 1 | 2 | 3;
  roundStarter: Side;
  initiative: Side;
  phase: GamePhase;
  duelScore: { player: number; opponent: number };
  player: PlayerState;
  opponent: PlayerState;
  pendingPlayerPlay: EnginePlay | null;
  pendingOpponentPlay: EnginePlay | null;
  lastDuel: DuelSummary | null;
  rounds: RoundSummary[];
  events: GameEvent[];
  winner?: Side | "draw";
  endReason?: "vida";
}
