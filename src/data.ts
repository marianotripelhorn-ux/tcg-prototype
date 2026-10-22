import type { CardDefinition, Faction, Position } from "./types";

export const positions: Position[] = ["siniestra", "trono", "diestra"];

export const positionLabels: Record<Position, string> = {
  siniestra: "SINIESTRA",
  trono: "TRONO",
  diestra: "DIESTRA"
};

export const factionLabels: Record<Faction, string> = {
  red: "Guardia Dextral",
  blue: "Corte Sinistral",
  white: "Empíreos",
  saints: "Santos"
};

const r1 = "./cards/red/red-cards-1.webp?v=cardstudio-final-1";
const r2 = "./cards/red/red-cards-2.webp?v=cardstudio-final-1";
const b1 = "./cards/blue/blue-cards-1.webp?v=game-export-1";
const b2 = "./cards/blue/blue-cards-2.webp?v=game-export-1";

export const redCards: CardDefinition[] = [
  { id:"caballero_tigre", studioId:"DEX-001", name:"CABALLERO TIGRE", power:6, faction:"red", affinity:"diestra", text:"Diestra: si ganaste el duelo anterior, +2.", effect:"won_prev2", art:{sprite:r1,column:2,row:0} },
  { id:"maestro_armas", studioId:"DEX-002", name:"MAESTRO DE ARMAS", power:7, faction:"red", affinity:"diestra", text:"Diestra: +3 si ya jugaste otra carta en Diestra esta ronda.", effect:"second_special3", art:{sprite:r2,column:1,row:0} },
  { id:"blazewalker", studioId:"DEX-003", name:"BLAZEWALKER", power:4, faction:"red", affinity:"siniestra", text:"Siniestra: +4 si ya jugaste en Trono esta ronda.", effect:"trono_before4", art:{sprite:r1,column:1,row:1} },
  { id:"guardia_castillo", studioId:"DEX-004", name:"GUARDIA DEL CASTILLO", power:5, faction:"red", affinity:"trono", text:"Trono: +3 si ya jugaste en Diestra esta ronda.", effect:"diestra_before3", art:{sprite:r2,column:0,row:0} },
  { id:"invocadagas", studioId:"DEX-005", name:"INVOCADAGAS", power:5, faction:"red", affinity:"diestra", text:"Diestra: +2 Poder.", effect:"bonus2", art:{sprite:r1,column:0,row:0} },
  { id:"guardia_dextral", studioId:"DEX-006", name:"GUARDIA DEXTRAL", power:5, faction:"red", affinity:"diestra", text:"Diestra: si es tu primera carta de la ronda o tu carta anterior fue jugada en Diestra, +2 Poder.", effect:"first_or_prev_diestra2", art:{sprite:r1,column:1,row:0} },
  { id:"corona_eterea", studioId:"DEX-007", name:"CORONA ETÉREA", power:2, faction:"red", affinity:"trono", text:"Trono: +5 si todavía no usaste Siniestra esta ronda.", effect:"empty_sin5", art:{sprite:r1,column:0,row:1} },
  { id:"mensajero", studioId:"DEX-008", name:"MENSAJERO EXTRAÑO", power:5, faction:"red", affinity:null, text:"Si perdés este duelo, tu próxima carta obtiene +3.", effect:"loss_next3", art:{sprite:r1,column:2,row:1} },
  { id:"asesor_real", studioId:"DEX-009", name:"ASESOR REAL", power:5, faction:"red", affinity:null, text:"Si ya ganaste un duelo esta ronda, tu próxima carta obtiene +3 Poder.", effect:"won_round_next3", art:{sprite:r2,column:2,row:0} },
  { id:"incendiario", studioId:"DEX-010", name:"INCENDIARIO", power:5, faction:"red", affinity:null, text:"Si es tu primera carta de la ronda, +3 Poder.", effect:"first_round3", art:{sprite:r2,column:0,row:1} },
  { id:"abanderado_real", studioId:"DEX-011", name:"ABANDERADO REAL", power:6, faction:"red", affinity:null, text:"Tu próxima carta en Diestra obtiene +2 Poder.", effect:"next_diestra2", art:{sprite:r2,column:1,row:1} },
  { id:"ejecutor_real", studioId:"DEX-012", name:"EJECUTOR REAL", power:5, faction:"red", affinity:null, text:"Si vas ganando la ronda, +2 Poder.", effect:"winning_round2", art:{sprite:r2,column:2,row:1} }
];

export const blueCards: CardDefinition[] = [
  {id:"protector",studioId:"SIN-001",name:"PROTECTOR",power:5,faction:"blue",affinity:"trono",text:"Trono: si perdiste el duelo anterior, la carta rival pierde 3 Poder.",effect:"lost_prev_enemy3",art:{sprite:b1,column:0,row:0}},
  {id:"asesino_sinistral",studioId:"SIN-002",name:"ASESINO SINISTRAL",power:4,faction:"blue",affinity:"siniestra",text:"Siniestra: la carta rival pierde 3 Poder.",effect:"enemy3",art:{sprite:b1,column:1,row:0}},
  {id:"criatura_invocada",studioId:"SIN-003",name:"CRIATURA INVOCADA",power:6,faction:"blue",affinity:"siniestra",text:"Siniestra: si la carta rival tiene 6 o más Poder impreso, +2.",effect:"enemy_printed6_2",art:{sprite:b1,column:2,row:0}},
  {id:"prodigio",studioId:"SIN-004",name:"PRODIGIO",power:3,faction:"blue",affinity:"siniestra",text:"Siniestra: su Poder es igual al Poder impreso rival +2.",effect:"copy_plus2",art:{sprite:b1,column:0,row:1}},
  {id:"invocador",studioId:"SIN-005",name:"INVOCADOR",power:3,faction:"blue",affinity:"trono",text:"Trono: si tu próxima carta activa su habilidad de posición, obtiene +2 Poder.",effect:"next_position2",art:{sprite:b1,column:1,row:1}},
  {id:"sabio",studioId:"SIN-006",name:"SABIO",power:4,faction:"blue",affinity:"trono",text:"Trono: la carta rival no activa su habilidad de posición este duelo.",effect:"cancel_enemy_affinity",art:{sprite:b1,column:2,row:1}},
  {id:"caballero_luciernaga",studioId:"SIN-007",name:"CABALLERO LUCIÉRNAGA",power:6,faction:"blue",affinity:"siniestra",text:"Siniestra: si es tu tercera carta de la ronda, +4.",effect:"third4",art:{sprite:b2,column:0,row:0}},
  {id:"archivista",studioId:"SIN-008",name:"ARCHIVISTA",power:5,faction:"blue",affinity:null,text:"+1 por cada carta en tu Archivo de la posición donde lo jugás.",effect:"archive_here",art:{sprite:b2,column:1,row:0}},
  {id:"oraculo",studioId:"SIN-009",name:"ORÁCULO",power:4,faction:"blue",affinity:"siniestra",text:"Siniestra: la próxima carta rival tiene −3 Poder.",effect:"enemy_next3",art:{sprite:b2,column:2,row:0}},
  {id:"desencantador",studioId:"SIN-010",name:"DESENCANTADOR",power:5,faction:"blue",affinity:"trono",text:"Trono: si la carta rival tiene más Poder que su Poder impreso, pierde 2 Poder.",effect:"enemy_boosted_minus2",art:{sprite:b2,column:0,row:1}},
  {id:"lectora_gestos",studioId:"SIN-011",name:"LECTORA DE GESTOS",power:5,faction:"blue",affinity:"siniestra",text:"Siniestra: si la carta rival tiene habilidad de posición, +2 Poder.",effect:"enemy_affinity2",art:{sprite:b2,column:1,row:1}},
  {id:"tejedor_sombras",studioId:"SIN-012",name:"TEJEDOR DE SOMBRAS",power:4,faction:"blue",affinity:"trono",text:"Trono: si el duelo anterior terminó en empate, la carta rival pierde 3 Poder.",effect:"prev_draw_enemy3",art:{sprite:b2,column:2,row:1}}
];

export const whiteCards: CardDefinition[] = [
  {id:"gusano_blanco",studioId:"EMP-001",name:"GUSANO BLANCO",power:4,faction:"white",affinity:null,text:"Si tu Archivo de esta posición está vacío, +2.",effect:"archive_empty2"},
  {id:"bibliotecario",studioId:"EMP-002",name:"BIBLIOTECARIO",power:4,faction:"white",affinity:null,text:"+1 por cada carta en tu Archivo de esta posición.",effect:"archive_here"},
  {id:"legionario_draconido",studioId:"EMP-003",name:"LEGIONARIO DRACÓNIDO",power:5,faction:"white",affinity:null,text:"Si tu Archivo de esta posición tiene 2 o más cartas, +2.",effect:"archive_two2"},
  {id:"libro_amaram",studioId:"EMP-004",name:"LIBRO DE AMARAM",power:2,faction:"white",affinity:null,text:"Vaciá tu Archivo de esta posición: +2 por cada carta eliminada.",effect:"clear_archive2x"},
  {id:"heraldo",studioId:"EMP-005",name:"HERALDO",power:5,faction:"white",affinity:null,text:"Si el Archivo rival de esta posición tiene más cartas que el tuyo, +2.",effect:"opp_archive_more2"},
  {id:"huevo",studioId:"EMP-006",name:"HUEVO SIN ECLOSIONAR",power:2,faction:"white",affinity:null,text:"Si tu Archivo de esta posición tiene 3 o más cartas, +6.",effect:"archive_three6"},
  {id:"dragon_anciano",studioId:"EMP-007",name:"DRAGÓN ANCIANO",power:6,faction:"white",affinity:"trono",text:"Trono: si tu Archivo de Trono tiene 3 o más cartas, +3.",effect:"trono_archive_three3"},
  {id:"forjador_anillos",studioId:"EMP-008",name:"FORJADOR DE ANILLOS",power:5,faction:"white",affinity:null,text:"Si lo jugás en tu Archivo menos poblado, +2.",effect:"least_archive2"},
  {id:"escriba_escamado",studioId:"EMP-009",name:"ESCRIBA ESCAMADO",power:4,faction:"white",affinity:null,text:"+1 por cada carta en el Archivo rival de esta posición, máximo +4.",effect:"opp_archive_capped"},
  {id:"cronista_draconido",studioId:"EMP-010",name:"CRONISTA DRACÓNIDO",power:4,faction:"white",affinity:null,text:"+1 por cada posición donde tu Archivo tenga más cartas que el rival, máximo +3.",effect:"archive_leads_global"},
  {id:"memoria_petrificada",studioId:"EMP-011",name:"MEMORIA PETRIFICADA",power:3,faction:"white",affinity:null,text:"Si tu Archivo de esta posición tiene exactamente 2 cartas, +5 Poder.",effect:"archive_exact2_5"},
  {id:"cartografo_empireo",studioId:"EMP-012",name:"CARTÓGRAFO EMPÍREO",power:5,faction:"white",affinity:null,text:"Si tus tres Archivos tienen cantidades distintas, +3 Poder.",effect:"archive_all_diff3"}
];

export const saintCards: CardDefinition[] = [
  {id:"santo_bifronte",studioId:"SAN-001",name:"SANTO BIFRONTE",power:6,faction:"saints",affinity:null,text:"Siniestra o Diestra: +1 Poder.",effect:"lateral1"},
  {id:"contrapeso",studioId:"SAN-002",name:"CONTRAPESO",power:6,faction:"saints",affinity:null,text:"Si vas perdiendo la ronda, +2 Poder.",effect:"losing_round2"},
  {id:"equilibrador",studioId:"SAN-003",name:"EQUILIBRADOR",power:6,faction:"saints",affinity:null,text:"Si el marcador de la ronda está empatado, +1 Poder.",effect:"score_tied1"},
  {id:"martir_espejo",studioId:"SAN-004",name:"MÁRTIR DEL ESPEJO",power:3,faction:"saints",affinity:null,text:"Si este duelo deja la ronda 1–1, tu próxima carta duplica su Poder base.",effect:"mirror_martyr"},
  {id:"custodio_eje",studioId:"SAN-005",name:"CUSTODIO DEL EJE",power:6,faction:"saints",affinity:"trono",text:"Trono: si ya jugaste en Siniestra o Diestra esta ronda, +2 Poder.",effect:"axis_lateral2"},
  {id:"paso_especular",studioId:"SAN-006",name:"PASO ESPECULAR",power:5,faction:"saints",affinity:null,text:"Si tu carta anterior fue jugada en la posición lateral opuesta, +3 Poder.",effect:"opposite_prev3"},
  {id:"procesion_perfecta",studioId:"SAN-007",name:"PROCESIÓN PERFECTA",power:5,faction:"saints",affinity:null,text:"Duplica su Poder base si en el segundo duelo jugaste en Trono.",effect:"second_trono_double"},
  {id:"reflejo_viviente",studioId:"SAN-008",name:"REFLEJO VIVIENTE",power:6,faction:"saints",affinity:null,text:"Si tu oponente jugó en la posición lateral opuesta, +2 Poder.",effect:"opposite_enemy2"},
  {id:"avatar_simetria",studioId:"SAN-009",name:"AVATAR DE SIMETRÍA",power:4,faction:"saints",affinity:null,text:"Si ambos campeones tienen la misma Vida, duplica su Poder base.",effect:"equal_life_double"},
  {id:"pendulo",studioId:"SAN-010",name:"PÉNDULO",power:4,faction:"saints",affinity:null,text:"Si ganaste un duelo y perdiste otro esta ronda, +4 Poder.",effect:"win_loss4"},
  {id:"santo_gemelo",studioId:"SAN-011",name:"SANTO GEMELO",power:5,faction:"saints",affinity:null,text:"Si el duelo anterior terminó en empate, +3 Poder.",effect:"prev_draw3"},
  {id:"palindromo",studioId:"SAN-012",name:"PALÍNDROMO",power:5,faction:"saints",affinity:null,text:"Si tu primera carta de la ronda fue jugada en la posición lateral opuesta a esta, +3 Poder.",effect:"first_opposite3"}
];

export const cardsByFaction: Record<Faction, CardDefinition[]> = {
  red: redCards,
  blue: blueCards,
  white: whiteCards,
  saints: saintCards
};

export const allCards = [...redCards, ...blueCards, ...whiteCards, ...saintCards];

export const byId = (id: string) => {
  const found = allCards.find(card => card.id === id || card.studioId === id);
  if (!found) throw new Error(`Unknown card: ${id}`);
  return found;
};
