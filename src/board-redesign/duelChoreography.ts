/**
 * Pure presentation contract for one resolved duel.
 * The engine supplies the final Power, outcome and explanatory notes.
 * No gameplay state is modified by this sequence.
 */
import type { DuelSummary, EnginePlay, GameState, Side } from "../engine/types";
import type { Position } from "../types";

export type DuelBeat = "approach" | "player-power" | "opponent-power" | "compare" | "impact" | "result" | "settle";

export const DUEL_BEATS: ReadonlyArray<{ at: number; beat: DuelBeat }> = [
  { at: 0, beat: "approach" },
  { at: 1320, beat: "player-power" },
  { at: 1890, beat: "opponent-power" },
  { at: 2500, beat: "compare" },
  { at: 2960, beat: "impact" },
  { at: 3380, beat: "result" },
  { at: 4100, beat: "settle" }
];
export const DUEL_FINISH_MS = 4520;

/** The values appear in sequence; both remain visible for the quiet comparison beat. */
export function powerIsRevealed(beat: DuelBeat, side: "player" | "opponent"): boolean {
  if (side === "player") return beat !== "approach";
  return beat === "opponent-power" || beat === "compare" || beat === "impact" || beat === "result" || beat === "settle";
}

/** Use the authoritative rules-engine notes rather than re-evaluating card abilities. */
export function duelPowerReasons(play: EnginePlay): { visible: string[]; hidden: number } {
  // "Base N" is already printed on the Power plate and wastes a callout.
  const notes = (play.notes ?? []).map(note => note.trim())
    .filter(note => note.length > 0 && !/^Base \d+$/.test(note));
  if (!notes.length && play.card.effect === "augury_match3") {
    return { visible: ["Augurio fallido · posiciones diferentes"], hidden: 0 };
  }
  return { visible: notes.slice(0, 2), hidden: Math.max(0, notes.length - 2) };
}

/** Confirmed visual sources only. Notes are produced by the rules engine,
 * never inferred by re-running a card's conditions in the presentation layer. */
export interface DuelSourceCue {
  side: Side;
  kind: "position" | "archive" | "champion";
  position?: Position;
}

function addCue(cues:DuelSourceCue[],cue:DuelSourceCue):void {
  if(!cues.some(c=>c.side===cue.side&&c.kind===cue.kind&&c.position===cue.position))cues.push(cue);
}
function otherSide(side:Side):Side {return side==="player"?"opponent":"player";}

export function powerSourceCues(duel:DuelSummary, side:Side, championId:string):DuelSourceCue[] {
  const play=side==="player"?duel.playerPlay:duel.opponentPlay;
  const notes=(play.notes??[]).filter(note=>!/^Base \d+$/.test(note));
  const cues:DuelSourceCue[]=[];
  for(const note of notes){
    const lower=note.toLocaleLowerCase("es");
    if(/archivo|libro de amaram/.test(lower)){
      const owner=/archivo rival/.test(lower)?otherSide(side):side;
      if(/archivos distintos|posiciones de archivo/.test(lower)){
        (["siniestra","trono","diestra"] as Position[]).forEach(position=>
          addCue(cues,{side:owner,kind:"archive",position}));
      }else addCue(cues,{side:owner,kind:"archive",position:play.position});
    }else if(
      /siniestra|diestra|trono|posición lateral|posición opuesta|primera posición|augurio · misma posición|fuera de afinidad/.test(lower)
    ){
      addCue(cues,{side,kind:"position",position:play.position});
    }
  }
  const ownChampionNotes:Record<string,RegExp>={
    vinira:/vinira/i,
    santo_simetrico:/santo simétrico/i,
    empireos:/señor de los archivos/i,
    samas:/samas/i
  };
  if(ownChampionNotes[championId]?.test(notes.join(" · ")))
    addCue(cues,{side,kind:"champion"});
  return cues;
}

/** Post-duel passives are signaled only when a known, real state transition or
 * the engine's settled duel outcome confirms them. Not all always-on passives
 * have a momentary trigger, and those should not falsely pulse. */
export function postDuelChampionCues(before:GameState|null,after:GameState|null,duel:DuelSummary):DuelSourceCue[] {
  if(!before||!after)return[];
  const cues:DuelSourceCue[]=[];
  for(const side of ["player","opponent"] as const){
    const a=after[side],b=before[side],id=a.champion.id;
    const ownPlay=side==="player"?duel.playerPlay:duel.opponentPlay;
    const ownOutcome=duel.outcome===side;
    const active=
      (id==="vinira" && a.viniraUsed && !b.viniraUsed) ||
      (id==="santo_simetrico" && (ownPlay.notes??[]).some(note=>note.includes("Santo Simétrico"))) ||
      (id==="athos" && ownOutcome && ownPlay.position==="diestra" && b.athosDiestraCapacity<3) ||
      (id==="sinistral" && !ownOutcome && duel.outcome!=="draw" && !b.bluePassiveUsed) ||
      (id==="samas" && duel.outcome==="draw") ||
      (id==="prioresa_luna_llena" && a.auguryHeals>b.auguryHeals) ||
      (id==="empireos" && a.empireanBuff>b.empireanBuff);
    if(active)addCue(cues,{side,kind:"champion"});
  }
  return cues;
}
