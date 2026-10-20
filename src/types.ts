export type Position = "siniestra" | "trono" | "diestra";

export type Faction = "red" | "blue" | "white" | "saints";

export interface CardDefinition {
  id: string;
  name: string;
  power: number;
  faction: Faction;
  affinity: Position | null;
  text: string;
  art?: {
    sprite: string;
    column: number;
    row: number;
  };
  trait?: string;
}

export interface PlayedCard {
  card: CardDefinition;
  finalPower?: number;
}
