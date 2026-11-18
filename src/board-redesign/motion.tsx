import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { CardDefinition, Position } from "../types";
import type { DuelSummary, EnginePlay, GameState } from "../engine/types";

export type BoardMotionPhase = "flight" | "duel" | "quiero-ai" | "round" | "archive" | "archive-reveal" | "deal" | "round-wipe" | "round-wipe-reveal";
export interface RectSnapshot { x:number;y:number;width:number;height:number }
export interface BoardMotionSequence {
  id:number;
  phase:BoardMotionPhase;
  before:GameState;
  duel:DuelSummary|null;
  roundEnded:boolean;
  handIndex:number|null;
  origin:RectSnapshot|null;
}
/**
 * A presentation-only frame. The game engine and saved after-state remain authoritative.
 * When a duel ends the round, preserve the played cards in their actual positions long
 * enough to move them visibly to the six corresponding Archive counters.
 */
export function visibleRoundPlays(motion:BoardMotionSequence|null,side:"player"|"opponent"):EnginePlay[]|null {
  if(!motion || motion.phase==="deal" || motion.phase==="archive-reveal" || motion.phase==="round-wipe-reveal") return null;
  const previous=motion.before[side].roundPlays;
  if(!motion.duel) return previous;
  return [...previous,side==="player"?motion.duel.playerPlay:motion.duel.opponentPlay];
}
export function visibleHand(motion:BoardMotionSequence|null, fallback:CardDefinition[]):CardDefinition[]{
  if(!motion || motion.phase==="deal" || motion.phase==="round-wipe-reveal")return fallback;
  if(motion.phase==="archive-reveal")return [];
  if(motion.handIndex===null)return motion.before.player.hand;
  return motion.before.player.hand.filter((_,index)=>index!==motion.handIndex);
}
export function makeRectSnapshot(element:Element|null):RectSnapshot|null{
  if(!element)return null;
  const r=element.getBoundingClientRect();
  if(!r.width||!r.height)return null;
  return {x:r.left,y:r.top,width:r.width,height:r.height};
}
export function handCardRect(handIndex:number):RectSnapshot|null {
  return makeRectSnapshot(document.querySelector(`[data-motion-hand-index="${handIndex}"]`));
}

interface CardFlightProps {
  origin:RectSnapshot|null;
  position:Position;
  children:ReactNode;
  onComplete:()=>void;
  onLand?:()=>void;
  reducedMotion:boolean;
  sequenceId:number;
}
/**
 * Uses the original printed React CardFace inside an unscaled staging element.
 * A WAAPI flight only animates the compositor transform; it never re-renders or
 * modifies the underlying CardDefinition or game action.
 */
export function CardFlight({origin,position,children,onComplete,onLand,reducedMotion,sequenceId}:CardFlightProps){
  const el=useRef<HTMLDivElement>(null);
  const shadow=useRef<HTMLSpanElement>(null);
  const complete=useRef(onComplete);
  complete.current=onComplete;
  const landed=useRef(onLand);
  landed.current=onLand;
  useLayoutEffect(()=>{
    if(reducedMotion||!origin){
      landed.current?.();
      complete.current();
      return;
    }
    const node=el.current;
    if(!node)return;
    const target=document.querySelector(`.board-slot.player[data-position="${position}"] .current-board-card`);
    const destination=makeRectSnapshot(target);
    if(!destination){
      landed.current?.();
      complete.current();
      return;
    }
    const dx=destination.x-origin.x,dy=destination.y-origin.y;
    const sx=destination.width/origin.width,sy=destination.height/origin.height;
    const liftEasing="cubic-bezier(.22,.78,.30,1)";
    const landingEasing="cubic-bezier(.32,.05,.25,1)";
    const timing:KeyframeAnimationOptions={duration:270,fill:"forwards"};
    let holdTimer:number|null=null;
    const animation=node.animate([
      {transform:"translate3d(0,0,0) scale(1)",offset:0,easing:liftEasing},
      {transform:`translate3d(${dx*.60}px,${dy*.60-14}px,0) scale(${1+(sx-1)*.60},${1+(sy-1)*.60})`,offset:.44,easing:landingEasing},
      {transform:`translate3d(${dx*.98}px,${dy*.98-2}px,0) scale(${sx*1.03},${sy*1.03})`,offset:.76},
      {transform:`translate3d(${dx}px,${dy}px,0) scale(${sx*.995},${sy*.995})`,offset:.90},
      {transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,offset:1}
    ],timing);
    const shadowAnimation=shadow.current?.animate([
      {transform:"translate3d(4px,7px,0) scale(1)",opacity:.4,offset:0,easing:liftEasing},
      {transform:"translate3d(16px,30px,0) scale(1.19,1.15)",opacity:.82,offset:.44,easing:landingEasing},
      {transform:"translate3d(7px,13px,0) scale(1.08,1.05)",opacity:.58,offset:.76},
      {transform:"translate3d(3px,4px,0) scale(.98,1)",opacity:.34,offset:.90},
      {transform:"translate3d(3px,4px,0) scale(.98,1)",opacity:.34,offset:1}
    ],timing);
    animation.onfinish=()=>{
      landed.current?.();
      holdTimer=window.setTimeout(()=>complete.current(),18);
    };
    return ()=>{
      animation.onfinish=null;animation.cancel();shadowAnimation?.cancel();
      if(holdTimer!==null)window.clearTimeout(holdTimer);
    };
  },[origin?.x,origin?.y,origin?.width,origin?.height,position,reducedMotion,sequenceId]);
  if(!origin||reducedMotion)return null;
  return <div className="board-motion-flight" ref={el} aria-hidden="true"
    style={{left:origin.x,top:origin.y,width:origin.width,height:origin.height}}>
    <span className="dl-flight-shadow" ref={shadow} aria-hidden="true"/>
    {children}
  </div>;
}

interface ArchiveFlightProps {
  sequenceId:number;
  reducedMotion:boolean;
  onComplete:()=>void;
}
/**
 * Exit motion reuses DOM played cards, preserving their current position, faction
 * face and order. They travel into their own side/position Archive: no fake count
 * is shown until the engine's already-calculated next round becomes visible.
 */
export function ArchiveFlight({sequenceId,reducedMotion,onComplete,onArrival}:ArchiveFlightProps & {
  onArrival?:(side:"player"|"opponent",position:Position)=>void;
}){
  const done=useRef(onComplete);
  const arrive=useRef(onArrival);
  done.current=onComplete;
  arrive.current=onArrival;
  useLayoutEffect(()=>{
    if(reducedMotion){done.current();return;}
    const arena=document.querySelector(".app-shell.board-redesign-v1 .battlefield");
    if(!arena){done.current();return;}
    const animations:Animation[]=[];
    const arrivals:Promise<void>[]=[];
    const archiveTargets=new Set<HTMLElement>();
    let cancelled=false;
    let sweepTimer:number|null=null;
    const cards=Array.from(arena.querySelectorAll<HTMLElement>(".board-slot .played-card"));
    const groupIndex=new Map<string,number>();
    for(const card of cards){
      const slot=card.closest<HTMLElement>(".board-slot");
      const destination=slot?.querySelector<HTMLElement>(".archive-count");
      const position=slot?.dataset.position;
      if(!slot||!destination||(position!=="siniestra"&&position!=="trono"&&position!=="diestra"))continue;
      const origin=makeRectSnapshot(card);
      const target=makeRectSnapshot(destination);
      if(!origin||!target)continue;
      const side=slot.classList.contains("player")?"player":"opponent";
      const slotKey=side+":"+position;
      const inSlot=groupIndex.get(slotKey)??0;
      groupIndex.set(slotKey,inSlot+1);
      const laneIndex=position==="siniestra"?0:position==="trono"?1:2;
      const delay=laneIndex*75+(side==="opponent"?0:45)+inSlot*30;
      const dx=target.x+target.width/2-(origin.x+origin.width/2);
      const dy=target.y+target.height/2-(origin.y+origin.height/2);
      const animation=card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d(0,-12px,0) scale(1.035)",opacity:1,offset:.2},
        {transform:`translate3d(${dx}px,${dy}px,0) scale(.14)`,opacity:.6,offset:.87},
        {transform:`translate3d(${dx}px,${dy}px,0) scale(.08)`,opacity:0,offset:1}
      ],{duration:640,easing:"cubic-bezier(.24,.69,.25,1)",delay,fill:"forwards"});
      animations.push(animation);
      arrivals.push(animation.finished.then(()=>{
        if(cancelled)return;
        archiveTargets.add(destination);
        destination.classList.remove("board-gs-archive-target");
        void destination.offsetWidth;
        destination.classList.add("board-gs-archive-target");
        arrive.current?.(side,position);
      },()=>{}));
    }
    // Unused cards go to discard. Move the actual art inside each button
    // because layout CSS pins the button's own transform.
    const remaining=Array.from(document.querySelectorAll<HTMLElement>(
      ".app-shell.board-redesign-v1 .hand-zone .hand-card > .game-card"
    ));
    remaining.forEach((card,index)=>{
      const distance=Math.max(35,card.getBoundingClientRect().height*.45);
      animations.push(card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d(0,-7px,0) scale(.98)",opacity:.92,offset:.27},
        {transform:`translate3d(0,${distance}px,0) scale(.72)`,opacity:0,offset:1}
      ],{duration:630,delay:80+index*70,easing:"cubic-bezier(.3,.78,.32,1)",fill:"forwards"}));
    });
    // Keep the 650ms curtain in place even if no cards can be measured.
    const curtainFinished=new Promise<void>(resolve=>{
      sweepTimer=window.setTimeout(resolve,700);
    });
    void Promise.allSettled([...animations.map(animation=>animation.finished),...arrivals,curtainFinished]).then(()=>{
      if(!cancelled)done.current();
    });
    return ()=>{
      cancelled=true;
      if(sweepTimer!==null)window.clearTimeout(sweepTimer);
      animations.forEach(animation=>animation.cancel());
      archiveTargets.forEach(target=>target.classList.remove("board-gs-archive-target"));
    };
  },[sequenceId,reducedMotion]);
  return null;
}

/** Settle the real engine hand as a group after the wipe clears. */
export function DealMotion({sequenceId,reducedMotion,onComplete,onLand}:ArchiveFlightProps & {
  onLand?:()=>void;
}){
  const done=useRef(onComplete);
  const land=useRef(onLand);
  done.current=onComplete;
  land.current=onLand;
  useLayoutEffect(()=>{
    if(reducedMotion){done.current();return;}
    const root=document.querySelector(".app-shell.board-redesign-v1");
    const cards=Array.from(root?.querySelectorAll<HTMLElement>(".hand-zone .hand-card > .game-card")??[]);
    const deck=makeRectSnapshot(root?.querySelector(".hybrid-deck-object, .hybrid-phone-deck summary")??null);
    const stagger=Math.min(44,132/Math.max(1,cards.length-1));
    const animations:Animation[]=[];
    cards.forEach((card,index)=>{
      const rect=makeRectSnapshot(card);
      if(!rect)return;
      // Approach each seat from the physical deck's direction without
      // sending the card through the clipped edge of the hand tray.
      const dx=deck?deck.x+deck.width/2-(rect.x+rect.width/2):0;
      const dy=deck?deck.y+deck.height/2-(rect.y+rect.height/2):22;
      const slideX=Math.max(-40,Math.min(40,dx));
      const slideY=Math.max(-24,Math.min(24,dy));
      animations.push(card.animate([
        {transform:`translate3d(${slideX}px,${slideY}px,0) scale(.94)`,opacity:0,offset:0,
          easing:"cubic-bezier(.20,.72,.24,1)"},
        {transform:"translate3d(0,-3px,0) scale(1.02)",opacity:1,offset:.74},
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:1}
      ],{duration:240,delay:index*stagger,fill:"both"}));
    });
    if(!animations.length){done.current();return;}
    let cancelled=false;
    const landings=animations.map(animation=>animation.finished.then(()=>{
      if(!cancelled)land.current?.();
    }));
    void Promise.allSettled(landings).then(()=>{
      if(!cancelled)done.current();
    });
    return ()=>{
      cancelled=true;
      animations.forEach(animation=>animation.cancel());
    };
  },[sequenceId,reducedMotion]);
  return null;
}
