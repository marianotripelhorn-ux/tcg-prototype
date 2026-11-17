import { useLayoutEffect, useRef } from "react";
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
  round,sequenceId,reducedMotion,covered,onCovered,onComplete
}:{
  round:number;
  sequenceId:number;
  reducedMotion:boolean;
  covered:boolean;
  onCovered:()=>void;
  onComplete:()=>void;
}){
  const ink=useRef<HTMLDivElement>(null);
  const entry=useRef<Animation|null>(null);
  const latest=useRef({onCovered,onComplete});
  latest.current={onCovered,onComplete};

  // Only a real completed compositor animation can cover the old board.
  // Unlike a fixed timer, this cannot swap the scene prematurely when
  // the browser drops/defers frames on a slower desktop or phone.
  useLayoutEffect(()=>{
    const node=ink.current;
    if(!node)return;
    if(reducedMotion){
      const timer=window.setTimeout(()=>latest.current.onCovered(),0);
      return ()=>window.clearTimeout(timer);
    }
    let cancelled=false;
    const cover=node.animate([
      {transform:"translate3d(-125%,0,0)"},
      {transform:"translate3d(0,0,0)"}
    ],{duration:224,easing:"cubic-bezier(.20,.74,.26,1)",fill:"forwards"});
    entry.current=cover;
    void cover.finished.then(()=>{
      if(!cancelled)latest.current.onCovered();
    }).catch(()=>{});
    return ()=>{
      cancelled=true;cover.cancel();entry.current=null;
    };
  },[sequenceId,reducedMotion]);

  // React has now committed the engine's already-resolved next board and
  // hand underneath the fully covered ink. Keep a short visible hold on
  // RONDA N; then the very same graphic and text continue off the right.
  useLayoutEffect(()=>{
    if(!covered)return;
    const node=ink.current;
    if(!node)return;
    if(reducedMotion){
      const timer=window.setTimeout(()=>latest.current.onComplete(),60);
      return ()=>window.clearTimeout(timer);
    }
    let cancelled=false;
    let exit:Animation|null=null;
    const timer=window.setTimeout(()=>{
      if(cancelled)return;
      // Preserve the fully covered geometry before cancelling entry fill.
      node.style.transform="translate3d(0,0,0)";
      entry.current?.cancel();
      entry.current=null;
      exit=node.animate([
        {transform:"translate3d(0,0,0)"},
        {transform:"translate3d(120%,0,0)"}
      ],{duration:384,easing:"cubic-bezier(.42,.10,.58,.94)",fill:"forwards"});
      void exit.finished.then(()=>{
        if(!cancelled)latest.current.onComplete();
      }).catch(()=>{});
    },184);
    return ()=>{
      cancelled=true;window.clearTimeout(timer);exit?.cancel();
    };
  },[covered,sequenceId,reducedMotion]);

  return <div className={"dl-new-round-stage"+(reducedMotion?" is-reduced":"")}
    data-wipe-stage={covered?"reveal":"cover"}
    role="status" aria-live="polite" aria-label={`Comienza ronda ${round}`}>
    <div className="dl-new-round-ink" ref={ink}>
      <span className="dl-new-round-number">RONDA {round}</span>
    </div>
  </div>;
}
