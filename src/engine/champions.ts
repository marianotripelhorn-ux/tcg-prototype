import type { ChampionDefinition } from "../types";

export const champions: Record<string, ChampionDefinition> = {
  dextral:{id:"dextral",name:"Majestad Dextral",faction:"red",life:9,special:"diestra",text:"Podés jugar hasta 2 cartas en Diestra."},
  athos:{id:"athos",name:"Athos, Capitán de la Guardia Dextral",faction:"red",life:9,special:null,text:"Cuando ganás un duelo con una carta en Diestra, habilitás otro espacio en Diestra esta ronda, hasta un máximo de 3."},
  sinistral:{id:"sinistral",name:"Corte Sinistral",faction:"blue",life:9,special:"siniestra",text:"Podés jugar hasta 2 cartas en Siniestra. Una vez por ronda, después de perder un duelo, la próxima carta rival tiene −1 Poder."},
  vinira:{id:"vinira",name:"Vinira, Royal de Ingris",faction:"blue",life:9,special:null,text:"Una vez por ronda, la primera carta que jugás fuera de su posición de afinidad activa igualmente su habilidad de posición y obtiene +1 Poder."},
  empireos:{id:"empireos",name:"Señor de los Archivos",faction:"white",life:9,special:null,text:"Si el rival usa las tres posiciones en una ronda, tu próxima carta obtiene +2 Poder."},
  desartes:{id:"desartes",name:"Desartes, El Empíreo Perdido",faction:"white",life:9,special:null,text:"Podés jugar hasta 2 cartas en la posición de tu Archivo más poblado. Los empates cuentan."},
  santo_simetrico:{id:"santo_simetrico",name:"Santo Simétrico",faction:"saints",life:9,special:null,text:"Una vez por ronda, si estás por perder un duelo por 1 de Poder, se convierte en empate."},
  samas:{id:"samas",name:"Samas, Quinto Santo de la Quiralidad",faction:"saints",life:9,special:null,text:"Después de empatar un duelo, tu próxima carta esta ronda obtiene +2 Poder."},
  prioresa_luna_llena:{id:"prioresa_luna_llena",name:"Prioresa de la Luna Llena",faction:"ivory",life:9,special:null,text:"Cada 3 Augurios acertados, recuperás 1 Vida. Máximo 2 veces por partida."}
};
