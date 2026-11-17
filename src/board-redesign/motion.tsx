import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { CardDefinition, Position } from "../types";
import type { DuelSummary, EnginePlay, GameState } from "../engine/types";

export type BoardMotionPhase = "flight" | "duel" | "quiero-ai" | "round" | "archive" | "archive-reveal" | "deal";
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
  if(!motion || motion.phase==="deal" || motion.phase==="archive-reveal") return null;
  const previous=motion.before[side].roundPlays;
  if(!motion.duel) return previous;
  return [...previous,side==="player"?motion.duel.playerPlay:motion.duel.opponentPlay];
}
export function visibleHand(motion:BoardMotionSequence|null, fallback:CardDefinition[]):CardDefinition[]{
  if(!motion || motion.phase==="deal")return fallback;
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
  const complete=useRef(onComplete);
  complete.current=onComplete;
  const landed=useRef(onLand);
  landed.current=onLand;
  useLayoutEffect(()=>{
    const node=el.current;
    if(!node)return;
    if(reducedMotion||!origin){
      landed.current?.();
      complete.current();
      return;
    }
    const target=document.querySelector(`.board-slot.player[data-position="${position}"] .current-board-card`);
    const destination=makeRectSnapshot(target);
    if(!destination){
      landed.current?.();
      complete.current();
      return;
    }
    const dx=destination.x-origin.x,dy=destination.y-origin.y;
    const sx=destination.width/origin.width,sy=destination.height/origin.height;
    // A restrained rise, slight tabletop tilt and physically eased landing.
    let holdTimer:number|null=null;
    const animation=node.animate([
      {transform:"translate3d(0,0,0) rotate(-3deg) scale(1)",filter:"drop-shadow(0 9px 12px #0008)",offset:0},
      {transform:`translate3d(${dx*.54}px,${dy*.54-29}px,0) rotate(2.8deg) scale(${(1+sx)*.57},${(1+sy)*.57})`,filter:"drop-shadow(0 24px 26px #0008)",offset:.58},
      {transform:`translate3d(${dx}px,${dy}px,0) rotate(-.9deg) scale(${sx},${sy})`,filter:"drop-shadow(0 13px 12px #0008)",offset:.91},
      {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${sx},${sy})`,filter:"drop-shadow(0 4px 4px #0007)",offset:1}
    ],{duration:900,easing:"cubic-bezier(.19,.8,.24,1)",fill:"forwards"});
    animation.onfinish=()=>{
      landed.current?.();
      holdTimer=window.setTimeout(()=>complete.current(),260);
    };
    return ()=>{
      animation.onfinish=null;animation.cancel();
      if(holdTimer!==null)window.clearTimeout(holdTimer);
    };
  },[origin?.x,origin?.y,origin?.width,origin?.height,position,reducedMotion,sequenceId]);
  if(!origin||reducedMotion)return null;
  return <div className="board-motion-flight" ref={el} aria-hidden="true"
    style={{left:origin.x,top:origin.y,width:origin.width,height:origin.height}}>
    {children}
    <span className="board-gs-flight-veil" aria-hidden="true">
      <span className="board-gs-flight-wave"/>
      <span className="board-gs-flight-ring outer"/>
      <span className="board-gs-flight-ring middle"/>
      <span className="board-gs-flight-ring inner"/>
    </span>
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
export function ArchiveFlight({sequenceId,reducedMotion,onComplete}:ArchiveFlightProps){
  const done=useRef(onComplete);
  done.current=onComplete;
  useLayoutEffect(()=>{
    if(reducedMotion){done.current();return;}
    const arena=document.querySelector(".app-shell.board-redesign-v1 .battlefield");
    if(!arena){done.current();return;}
    const animations:Animation[]=[];
    const animatedCards:HTMLElement[]=[];
    const archiveTargets=new Set<HTMLElement>();
    const arrivalTimers:number[]=[];
    let sweepTimer:number|null=null;
    const clearFx=()=>{
      animatedCards.forEach(card=>card.classList.remove("board-gs-archiving"));
      archiveTargets.forEach(target=>target.classList.remove("board-gs-archive-target"));
    };
    const cards=Array.from(arena.querySelectorAll<HTMLElement>(".board-slot .played-card"));
    // Opponent then player; across each side: Siniestra, Trono, Diestra.
    const groupIndex=new Map<string,number>();
    for(let i=0;i<cards.length;i++){
      const card=cards[i];
      const parent=card.closest<HTMLElement>(".board-slot");
      const destination=parent?.querySelector<HTMLElement>(".archive-count");
      if(!destination)continue;
      const a=card.getBoundingClientRect(),b=destination.getBoundingClientRect();
      if(!a.width||!a.height)continue;
      card.classList.add("board-gs-archiving");
      animatedCards.push(card);
      archiveTargets.add(destination);
      const side=parent?.classList.contains("player")?"player":"opponent";
      const position=parent?.dataset.position??"trono";
      const slotKey=side+":"+position;
      const inSlot=groupIndex.get(slotKey)??0;
      groupIndex.set(slotKey,inSlot+1);
      const laneIndex=position==="siniestra"?0:position==="trono"?1:2;
      // Travel with the left-to-right darkness, preserving each card's
      // real side/position Archive destination (never the score ribbon).
      const delay=laneIndex*75+(side==="opponent"?0:45)+inSlot*30;
      const dx=b.left+b.width/2-(a.left+a.width/2);
      const dy=b.top+b.height/2-(a.top+a.height/2);
      const animation=card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d(0,-12px,0) scale(1.035)",opacity:1,offset:.2},
        {transform:`translate3d(${dx}px,${dy}px,0) rotate(-5deg) scale(.14)`,opacity:.45,offset:.87},
        {transform:`translate3d(${dx}px,${dy+8}px,0) rotate(-5deg) scale(.08)`,opacity:0,offset:1}
      ],{duration:640,easing:"cubic-bezier(.24,.69,.25,1)",delay,fill:"forwards"});
      // Archive rings respond at arrival instead of when the card leaves.
      arrivalTimers.push(window.setTimeout(()=>{
        destination.classList.remove("board-gs-archive-target");
        void destination.offsetWidth;
        destination.classList.add("board-gs-archive-target");
      },delay+515));
      animations.push(animation);
    }
    // Unused hand cards are DISCARDED, not returned to the deck and not
    // archived. Let them dissolve into the lower hand shadow rather than
    // incorrectly flying toward the physical deck object.
    const remaining=Array.from(document.querySelectorAll<HTMLElement>(".app-shell.board-redesign-v1 .hand-zone .hand-card"));
    for(let i=0;i<remaining.length;i++){
      const card=remaining[i],rect=card.getBoundingClientRect();
      const dx=i%2===0?-16:16;
      const dy=Math.max(35,rect.height*.45);
      animations.push(card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d(0,-7px,0) scale(.98)",opacity:.92,offset:.27},
        {transform:`translate3d(${dx}px,${dy}px,0) rotate(8deg) scale(.62)`,opacity:0,offset:1}
      ],{duration:630,delay:80+i*70,easing:"cubic-bezier(.3,.78,.32,1)",fill:"forwards"}));
    }
    let cancelled=false;
    // Even an unusual round with no animatable played cards should complete
    // the curtain instead of cutting the transition off immediately.
    // Keep the single GPU translation mounted through its 650ms exit.
    // Do not cut the veil off when a fast Archive flight completes first.
    const curtainFinished=new Promise<void>(resolve=>{
      sweepTimer=window.setTimeout(resolve,700);
    });
    Promise.all([...animations.map(a=>a.finished.catch(()=>{})),curtainFinished]).then(()=>{
      if(!cancelled){clearFx();done.current();}
    });
    return ()=>{cancelled=true;if(sweepTimer!==null)window.clearTimeout(sweepTimer);
      arrivalTimers.forEach(t=>window.clearTimeout(t));animations.forEach(a=>a.cancel());clearFx();};
  },[sequenceId,reducedMotion]);
  return null;
}

/** Reveal the real newly-dealt hand from the physical deck, after the Archive
 * transition has completed. The new game hand already exists in the engine. */
export function DealMotion({sequenceId,reducedMotion,onComplete}:ArchiveFlightProps){
  const done=useRef(onComplete);
  done.current=onComplete;
  useLayoutEffect(()=>{
    if(reducedMotion){done.current();return;}
    const cards=Array.from(document.querySelectorAll<HTMLElement>(".app-shell.board-redesign-v1 .hand-zone .hand-card"));
    const source=document.querySelector<HTMLElement>(
      ".app-shell.board-redesign-v1 :is(.hybrid-deck-object, .hybrid-phone-deck summary)"
    );
    const deck=source?.getBoundingClientRect();
    const animations:Animation[]=[];
    const clearFx=()=>cards.forEach(card=>card.classList.remove("board-gs-dealing"));
    cards.forEach((card,index)=>{
      const rect=card.getBoundingClientRect();
      if(!rect.width)return;
      card.classList.add("board-gs-dealing");
      const dx=deck?deck.left+deck.width/2-(rect.left+rect.width/2):160;
      const dy=deck?deck.top+deck.height/2-(rect.top+rect.height/2):55;
      animations.push(card.animate([
        {transform:`translate3d(${dx}px,${dy}px,0) rotate(9deg) scale(.3)`,opacity:0,offset:0},
        {transform:"translate3d(0,-9px,0) rotate(-1deg) scale(1.025)",opacity:1,offset:.83},
        {transform:"translate3d(0,0,0) rotate(0deg) scale(1)",opacity:1,offset:1}
      ],{duration:600,delay:index*85,easing:"cubic-bezier(.2,.72,.29,1)",fill:"forwards"}));
    });
    let cancelled=false;
    if(!animations.length){done.current();return;}
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{
      if(!cancelled){clearFx();done.current();}
    });
    return ()=>{cancelled=true;animations.forEach(a=>a.cancel());clearFx();};
  },[sequenceId,reducedMotion]);
  return null;
}


