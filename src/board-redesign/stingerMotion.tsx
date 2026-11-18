import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { DuelSummary, GameState } from "../engine/types";
import { championBackgroundUrl, championShortName } from "../championArtwork";

export function CeremonyBackdrop({image}:{image?:string}) {
  return <span className="dl-ceremony-backdrop" aria-hidden="true">
    {image&&<img className="dl-ceremony-art" src={image} alt=""/>}
  </span>;
}

/** The engine supplies both final Power values and the outcome. */
export function DuelResultStinger({duel,onComplete,bannerImage,held=false}:{
  duel:DuelSummary;
  onComplete?:()=>void;
  bannerImage?:string;
  held?:boolean;
}) {
  const card=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const banner=card.current;
    const field=banner?.closest(".arena-main");
    const parent=banner?.offsetParent;
    if(!banner||!field||!(parent instanceof HTMLElement))return;
    const center=()=>{
      const area=field.getBoundingClientRect();
      const container=parent.getBoundingClientRect();
      banner.style.setProperty("--dl-banner-x",(area.left+area.width/2-container.left-parent.clientLeft+parent.scrollLeft)+"px");
      banner.style.setProperty("--dl-banner-y",(area.top+area.height/2-container.top-parent.clientTop+parent.scrollTop)+"px");
    };
    center();
    const observer=new ResizeObserver(center);
    observer.observe(field);
    return ()=>observer.disconnect();
  },[]);
  const playerPower=duel.playerPlay.finalPower??duel.playerPlay.card.power;
  const opponentPower=duel.opponentPlay.finalPower??duel.opponentPlay.card.power;
  const result=duel.outcome==="player"?"VICTORIA":duel.outcome==="opponent"?"DERROTA":"EMPATE";
  return <div ref={card} className={"dl-duel-stinger dl-ceremony-banner"+(held?" dl-guide-held":"")}
    role="status" aria-live="polite"
    onAnimationEnd={event=>{
      if(event.target===event.currentTarget&&event.animationName==="dl-duel-banner")onComplete?.();
    }}
    data-player-power={playerPower} data-opponent-power={opponentPower}
    data-outcome={duel.outcome} aria-label={"Poder final: vos "+playerPower+"; rival "+opponentPower+". "+result}>
    <CeremonyBackdrop image={bannerImage}/>
    <span className="dl-ceremony-kicker">DUELO {duel.turn}</span>
    <strong className="dl-duel-stinger-result">{result}</strong>
    <div className="dl-ceremony-rule" aria-hidden="true"/>
    <div className="dl-duel-stinger-contents">
      <span className="dl-duel-stinger-power"><small>TU PODER</small><strong>{playerPower}</strong></span>
      <span className="dl-duel-stinger-power"><small>PODER RIVAL</small><strong>{opponentPower}</strong></span>
    </div>
    {held&&<p className="dl-guide-banner-note">{duel.outcome==="draw"
      ?"En un empate, nadie pierde Vida."
      :"Al continuar, se actualizan la Vida y el marcador."}</p>}
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
    <div className="dl-new-round-ink dl-ceremony-banner" ref={banner}>
      <CeremonyBackdrop image={bannerImage}/>
      <span className="dl-new-round-number">RONDA {round}</span>
      <div className="dl-ceremony-rule" aria-hidden="true"/>
    </div>
  </div>;
}

/** Holds the real outcome until the player chooses to see the post-match actions. */
export function MatchFinaleBanner({game,kicker,title,onContinue}:{
  game:GameState;
  kicker:string;
  title:string;
  onContinue:()=>void;
}){
  const titleId=useId();
  const next=useRef<HTMLButtonElement>(null);
  useEffect(()=>next.current?.focus({preventScroll:true}),[]);
  const won=game.winner==="player"?game.player.champion:
    game.winner==="opponent"?game.opponent.champion:null;
  const championNames=won?championShortName(won.name):
    [game.player.champion,game.opponent.champion].map(champion=>championShortName(champion.name)).join(" · ");
  return <div className="dl-match-finale dl-ceremony-banner"
    role="dialog" aria-modal="true" aria-labelledby={titleId} data-outcome={game.winner??"draw"} data-champion={won?.id}>
    <CeremonyBackdrop image={championBackgroundUrl((won??game.player.champion).faction)}/>
    <span className="dl-ceremony-kicker">{kicker}</span>
    <h2 id={titleId}>{title}</h2>
    <p className="dl-finale-champion">{championNames}</p>
    <div className="dl-ceremony-rule" aria-hidden="true"/>
    <div className="dl-finale-life">
      <span><small>TU VIDA</small><strong>{game.player.life}</strong></span>
      <span><small>VIDA RIVAL</small><strong>{game.opponent.life}</strong></span>
    </div>
    <button ref={next} type="button" className="dl-finale-continue" onClick={onContinue}>CONTINUAR →</button>
  </div>;
}
