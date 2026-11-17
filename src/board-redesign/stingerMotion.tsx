import { useEffect, useRef } from "react";
import type { DuelSummary } from "../engine/types";

/** The engine owns finalPower and outcome. Text and ribbon share one surface. */
export function DuelResultStinger({duel}:{duel:DuelSummary}) {
  const playerPower=duel.playerPlay.finalPower??duel.playerPlay.card.power;
  const opponentPower=duel.opponentPlay.finalPower??duel.opponentPlay.card.power;
  const result=duel.outcome==="player"?"VICTORIA":duel.outcome==="opponent"?"DERROTA":"EMPATE";
  return <div className="dl-duel-stinger" role="status" aria-live="polite"
    data-player-power={playerPower} data-opponent-power={opponentPower}
    data-outcome={duel.outcome} aria-label={`Poder final: vos ${playerPower}; rival ${opponentPower}. ${result}`}>
    <div className="dl-duel-stinger-contents">
      <span className="dl-duel-stinger-power"><small>TU PODER</small><strong>{playerPower}</strong></span>
      <strong className="dl-duel-stinger-result">{result}</strong>
      <span className="dl-duel-stinger-power"><small>PODER RIVAL</small><strong>{opponentPower}</strong></span>
    </div>
  </div>;
}

/** A single matte curved surface and its round number animate as ONE unit.
 * onCovered changes only what is rendered; the already-committed engine state
 * was established before the wipe began. No rule is recalculated here.
 */
export function NewRoundStinger({
  round,sequenceId,reducedMotion,onCovered,onComplete
}:{
  round:number;
  sequenceId:number;
  reducedMotion:boolean;
  onCovered:()=>void;
  onComplete:()=>void;
}){
  const latest=useRef({onCovered,onComplete});
  latest.current={onCovered,onComplete};
  useEffect(()=>{
    const coverTimer=window.setTimeout(()=>latest.current.onCovered(),reducedMotion?0:336);
    const finishTimer=window.setTimeout(()=>latest.current.onComplete(),reducedMotion?75:830);
    return ()=>{
      window.clearTimeout(coverTimer);
      window.clearTimeout(finishTimer);
    };
  },[sequenceId,reducedMotion]);
  return <div className={"dl-new-round-stage"+(reducedMotion?" is-reduced":"")}
    role="status" aria-live="polite" aria-label={`Comienza ronda ${round}`}>
    <div className="dl-new-round-ink">
      <span className="dl-new-round-number">RONDA {round}</span>
    </div>
  </div>;
}
