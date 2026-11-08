import type { CardDefinition, Faction, Position } from "../types";
import type { ActiveManifestation, PlayerState, SpecialKind } from "./types";

/** Manifestaciones v0.1. Shared rule dictionary, independent of faction deck. */
export const CREATOR_KIND:Record<string,SpecialKind>={
  caballero_tigre:"dagger",
  invocadagas:"dagger",
  guardia_dextral:"dagger",
  caballero_luciernaga:"dagger",
  caballero_marfil:"dagger",
  protector:"shield",
  invocador:"shield",
  desencantador:"shield",
  libro_amaram:"relic",
  huevo:"relic",
  daga_lunar:"relic",
  memoria_petrificada:"relic",
  santo_bifronte:"symmetry",
  contrapeso:"symmetry",
  paso_especular:"symmetry",
  santo_gemelo:"symmetry"
};
export const SPECIAL_NAME:Record<SpecialKind,string>={
  dagger:"DAGA ETÉREA",shield:"ESCUDO ETÉREO",
  relic:"RELIQUIA",symmetry:"SIMETRÍA PERFECTA"
};
export const SPECIAL_TEXT:Record<SpecialKind,string>={
  dagger:"+1 Poder a una carta cuando la jugás. Después del duelo, la Daga va al Archivo de esa posición.",
  shield:"Se coloca en la posición de su creador al resolver el duelo. La próxima carta rival jugada en esa posición recibe −2 Poder. Luego se consume.",
  relic:"Colocala en una posición propia vacía. Después de cada duelo, suma 2 cartas a ese Archivo mientras la posición siga sin usarse. Expira al final de la ronda.",
  symmetry:"Copiá un Escudo o Reliquia rival visible en la misma posición de tu campo, o una Daga Etérea del Archivo rival a tu mano. Máximo una Simetría Perfecta en la mano."
};
export function specialKindFor(card:CardDefinition):SpecialKind|undefined{
  return CREATOR_KIND[card.id];
}
export function ensureManifestations(p:PlayerState):void{
  p.specialHand??=[];
  p.manifestations??=[];
}
export function archivedSpecial(kind:"dagger"|"relic",faction:Faction):CardDefinition{
  return {
    id:"archive_"+kind,studioId:"TOKEN-"+kind.toUpperCase(),
    name:kind==="dagger"?"DAGA ETÉREA":"RELIQUIA",
    power:0,faction,affinity:null,text:SPECIAL_TEXT[kind],
    effect:"archived_token",specialArchiveKind:kind
  };
}
export function shieldCount(player:PlayerState,position:Position){
  return (player.manifestations||[]).filter(t=>t.kind==="shield"&&t.position===position).length;
}
export function generateOnPlay(player:PlayerState,card:CardDefinition,position:Position,round:number){
  ensureManifestations(player);
  const kind=specialKindFor(card);
  if(!kind)return undefined;
  if(kind==="shield"){
    // Activated only from the following duel, never retroactively.
    player.manifestations.push({kind:"shield",position,createdRound:round});
  }else if(kind!=="symmetry" || !player.specialHand.includes("symmetry")){
    player.specialHand.push(kind);
  }
  return kind;
}
export type CopyTarget={kind:"dagger"|"shield"|"relic";position:Position};
export function copyTargets(opponent:PlayerState):CopyTarget[]{
  ensureManifestations(opponent);
  const targets:CopyTarget[]=[];
  for(const t of opponent.manifestations){
    if(!targets.some(x=>x.kind===t.kind&&x.position===t.position)){
      targets.push({kind:t.kind,position:t.position});
    }
  }
  for(const pos of ["siniestra","trono","diestra"] as Position[]){
    if(opponent.archives[pos].some(c=>c.specialArchiveKind==="dagger")){
      targets.push({kind:"dagger",position:pos});
    }
  }
  return targets;
}
export function collectRelicArchive(player:PlayerState,round:number){
  ensureManifestations(player);
  for(const token of player.manifestations){
    if(token.kind==="relic"&&token.createdRound===round
      &&player.roundPlays.every(play=>play.position!==token.position)){
      player.archives[token.position].push(
        archivedSpecial("relic",player.champion.faction),
        archivedSpecial("relic",player.champion.faction)
      );
    }
  }
}
export function expireRelics(player:PlayerState){
  ensureManifestations(player);
  player.manifestations=player.manifestations.filter(t=>t.kind!=="relic");
}
export function consumeShields(player:PlayerState,enemyPosition:Position){
  ensureManifestations(player);
  const before=player.manifestations.length;
  player.manifestations=player.manifestations.filter(t=>t.kind!=="shield"||t.position!==enemyPosition);
  return before-player.manifestations.length;
}
