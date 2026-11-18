import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { DuelSummary } from "../engine/types";

export function ceremonyArt(image?:string):CSSProperties {
  return { "--dl-ceremony-art":image?'url("'+image+'")':"none" } as CSSProperties;
}

/** The engine supplies both final Power values and the outcome. */
export function DuelResultStinger({duel,onComplete,bannerImage}:{
  duel:DuelSummary;
  onComplete?:()=>void;
  bannerImage?:string;
}) {
  const playerPower=duel.playerPlay.finalPower??duel.playerPlay.card.power;
  const opponentPower=duel.opponentPlay.finalPower??duel.opponentPlay.card.power;
  const result=duel.outcome==="player"?"VICTORIA":duel.outcome==="opponent"?"DERROTA":"EMPATE";
  return <div className="dl-duel-stinger dl-ceremony-banner" style={ceremonyArt(bannerImage)}
    role="status" aria-live="polite"
    onAnimationEnd={event=>{
      if(event.target===event.currentTarget&&event.animationName==="dl-duel-banner")onComplete?.();
    }}
    data-player-power={playerPower} data-opponent-power={opponentPower}
    data-outcome={duel.outcome} aria-label={"Poder final: vos "+playerPower+"; rival "+opponentPower+". "+result}>
    <span className="dl-ceremony-kicker">DUELO {duel.turn}</span>
    <strong className="dl-duel-stinger-result">{result}</strong>
    <div className="dl-ceremony-rule" aria-hidden="true"/>
    <div className="dl-duel-stinger-contents">
      <span className="dl-duel-stinger-power"><small>TU PODER</small><strong>{playerPower}</strong></span>
      <span className="dl-duel-stinger-power"><small>PODER RIVAL</small><strong>{opponentPower}</strong></span>
    </div>
  </div>;
}

/** Swap the presented state only after the stationary backdrop is opaque. */
export function NewRoundStinger({
  round,sequenceId,reducedMotion,covered,onCovered,onComplete,bannerImage
}:{
  round:number;
  sequenceId:number;
  reducedMotion:boolean;
  covered:boolean;
  onCovered:()=>void;
  onComplete:()=>void;
  bannerImage?:string;
}){
  const backdrop=useRef<HTMLDivElement>(null);
  const banner=useRef<HTMLDivElement>(null);
  const entries=useRef<Animation[]>([]);
  const latest=useRef({onCovered,onComplete});
  latest.current={onCovered,onComplete};

  useLayoutEffect(()=>{
    const surface=backdrop.current;
    const node=banner.current;
    if(!surface||!node)return;
    if(reducedMotion){
      const timer=window.setTimeout(()=>latest.current.onCovered(),0);
      return ()=>window.clearTimeout(timer);
    }
    let cancelled=false;
    const timing={duration:250,easing:"cubic-bezier(.2,.74,.26,1)",fill:"forwards"} as const;
    const cover=[
      surface.animate([{opacity:0},{opacity:1}],timing),
      node.animate([
        {transform:"translate3d(0,-28px,0)",opacity:0},
        {transform:"translate3d(0,0,0)",opacity:1}
      ],timing)
    ];
    entries.current=cover;
    void Promise.allSettled(cover.map(animation=>animation.finished)).then(results=>{
      if(!cancelled&&results.every(result=>result.status==="fulfilled"))latest.current.onCovered();
    });
    return ()=>{
      cancelled=true;
      cover.forEach(animation=>animation.cancel());
      entries.current=[];
    };
  },[sequenceId,reducedMotion]);

  useLayoutEffect(()=>{
    const surface=backdrop.current;
    const node=banner.current;
    if(!covered||!surface||!node)return;
    let cancelled=false;
    const exits:Animation[]=[];
    const timer=window.setTimeout(()=>{
      if(cancelled)return;
      if(reducedMotion){latest.current.onComplete();return;}
      surface.style.opacity="1";
      node.style.opacity="1";
      node.style.transform="translate3d(0,0,0)";
      entries.current.forEach(animation=>animation.cancel());
      const timing={duration:240,easing:"cubic-bezier(.32,.03,.61,1)",fill:"forwards"} as const;
      exits.push(surface.animate([{opacity:1},{opacity:0}],timing));
      exits.push(node.animate([
        {transform:"translate3d(0,0,0)",opacity:1},
        {transform:"translate3d(0,-20px,0)",opacity:0}
      ],timing));
      void Promise.allSettled(exits.map(animation=>animation.finished)).then(()=>{
        if(!cancelled)latest.current.onComplete();
      });
    },850);
    return ()=>{
      cancelled=true;
      window.clearTimeout(timer);
      exits.forEach(animation=>animation.cancel());
    };
  },[covered,sequenceId,reducedMotion]);

  return <div className={"dl-new-round-stage"+(reducedMotion?" is-reduced":"")} ref={backdrop}
    data-wipe-stage={covered?"reveal":"cover"}
    role="status" aria-live="polite" aria-label={"Comienza ronda "+round}>
    <div className="dl-new-round-ink dl-ceremony-banner" ref={banner} style={ceremonyArt(bannerImage)}>
      <span className="dl-new-round-number">RONDA {round}</span>
      <div className="dl-ceremony-rule" aria-hidden="true"/>
    </div>
  </div>;
}
