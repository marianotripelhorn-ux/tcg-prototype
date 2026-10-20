export type Position = "siniestra" | "trono" | "diestra";
export type Faction = "red" | "blue" | "white" | "saints";
export type DuelResult = "win" | "loss" | "draw";

export interface CardDefinition {
  id: string;
  studioId: string;
  name: string;
  power: number;
  faction: Faction;
  affinity: Position | null;
  text: string;
  effect: string;
  art?: {
    sprite: string;
    column: number;
    row: number;
  };
  trait?: string;
}

export interface PlayedCard {
  card: CardDefinition;
  position?: Position;
  finalPower?: number;
  notes?: string[];
}

export interface ChampionDefinition {
  id: string;
  name: string;
  faction: Faction;
  life: number;
  special: Position | null;
  text: string;
}
