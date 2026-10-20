import type { CardDefinition, Position } from "./types";

export const positions: Position[] = ["siniestra", "trono", "diestra"];

export const positionLabels: Record<Position, string> = {
  siniestra: "SINIESTRA",
  trono: "TRONO",
  diestra: "DIESTRA"
};

const r1 = "/assets/art-red-1.svg";
const r2 = "/assets/art-red-2.svg";

export const redCards: CardDefinition[] = [
  { id:"invocadagas", name:"INVOCADAGAS", power:5, faction:"red", affinity:"diestra", text:"Diestra: +2 Poder.", art:{sprite:r1,column:0,row:0}, trait:"Ringbearer" },
  { id:"guardia_dextral", name:"GUARDIA DEXTRAL", power:5, faction:"red", affinity:"diestra", text:"Diestra: si es tu primera carta de la ronda o tu carta anterior fue jugada en Diestra, +2 Poder.", art:{sprite:r1,column:1,row:0} },
  { id:"caballero_tigre", name:"CABALLERO TIGRE", power:6, faction:"red", affinity:"diestra", text:"Diestra: si ganaste el duelo anterior, +2.", art:{sprite:r1,column:2,row:0}, trait:"Ringbearer" },
  { id:"corona_eterea", name:"CORONA ETÉREA", power:2, faction:"red", affinity:"trono", text:"Trono: +5 si todavía no usaste Siniestra esta ronda.", art:{sprite:r1,column:0,row:1} },
  { id:"blazewalker", name:"BLAZEWALKER", power:4, faction:"red", affinity:"siniestra", text:"Siniestra: +4 si ya jugaste en Trono esta ronda.", art:{sprite:r1,column:1,row:1}, trait:"Ringbearer" },
  { id:"mensajero", name:"MENSAJERO EXTRAÑO", power:5, faction:"red", affinity:null, text:"Si perdés este duelo, tu próxima carta obtiene +3.", art:{sprite:r1,column:2,row:1} },
  { id:"guardia_castillo", name:"GUARDIA DEL CASTILLO", power:5, faction:"red", affinity:"trono", text:"Trono: +3 si ya jugaste en Diestra esta ronda.", art:{sprite:r2,column:0,row:0} },
  { id:"maestro_armas", name:"MAESTRO DE ARMAS", power:7, faction:"red", affinity:"diestra", text:"Diestra: +3 si ya jugaste otra carta en Diestra esta ronda.", art:{sprite:r2,column:1,row:0}, trait:"Ringbearer" },
  { id:"asesor_real", name:"ASESOR REAL", power:5, faction:"red", affinity:null, text:"Si ya ganaste un duelo esta ronda, tu próxima carta obtiene +3 Poder.", art:{sprite:r2,column:2,row:0} },
  { id:"incendiario", name:"INCENDIARIO", power:5, faction:"red", affinity:null, text:"Si es tu primera carta de la ronda, +3 Poder.", art:{sprite:r2,column:0,row:1}, trait:"Ringbearer" },
  { id:"abanderado_real", name:"ABANDERADO REAL", power:6, faction:"red", affinity:null, text:"Tu próxima carta en Diestra obtiene +2 Poder.", art:{sprite:r2,column:1,row:1} },
  { id:"ejecutor_real", name:"EJECUTOR REAL", power:5, faction:"red", affinity:null, text:"Si vas ganando la ronda, +2 Poder.", art:{sprite:r2,column:2,row:1} }
];

export const byId = (id: string) => {
  const found = redCards.find(card => card.id === id);
  if (!found) throw new Error(`Unknown card: ${id}`);
  return found;
};
