import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CardDefinition, Position } from "../types";
import type { DuelSummary, EnginePlay, GameState } from "../engine/types";

export type BoardMotionPhase = "flight" | "duel" | "archive" | "deal";
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
  if(!motion || motion.phase==="deal") return null;
  const previous=motion.before[side].roundPlays;
  if(!motion.duel) return previous;
  return [...previous,side==="player"?motion.duel.playerPlay:motion.duel.opponentPlay];
}
export function visibleHand(motion:BoardMotionSequence|null, fallback:CardDefinition[]):CardDefinition[]{
  if(!motion || motion.phase==="deal")return fallback;
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
  reducedMotion:boolean;
  sequenceId:number;
}
/**
 * Uses the original printed React CardFace inside an unscaled staging element.
 * A WAAPI flight only animates the compositor transform; it never re-renders or
 * modifies the underlying CardDefinition or game action.
 */
export function CardFlight({origin,position,children,onComplete,reducedMotion,sequenceId}:CardFlightProps){
  const el=useRef<HTMLDivElement>(null);
  const complete=useRef(onComplete);
  complete.current=onComplete;
  useLayoutEffect(()=>{
    const node=el.current;
    if(!node)return;
    if(reducedMotion||!origin){
      complete.current();
      return;
    }
    const target=document.querySelector(`.board-slot.player[data-position="${position}"] .current-board-card`);
    const destination=makeRectSnapshot(target);
    if(!destination){
      complete.current();
      return;
    }
    const dx=destination.x-origin.x,dy=destination.y-origin.y;
    const sx=destination.width/origin.width,sy=destination.height/origin.height;
    // A restrained rise, slight tabletop tilt and physically eased landing.
    const animation=node.animate([
      {transform:"translate3d(0,0,0) rotate(-3deg) scale(1)",filter:"drop-shadow(0 9px 12px #0008)",offset:0},
      {transform:`translate3d(${dx*.54}px,${dy*.54-29}px,0) rotate(2.8deg) scale(${(1+sx)*.57},${(1+sy)*.57})`,filter:"drop-shadow(0 24px 26px #0008)",offset:.58},
      {transform:`translate3d(${dx}px,${dy}px,0) rotate(-.9deg) scale(${sx},${sy})`,filter:"drop-shadow(0 13px 12px #0008)",offset:.91},
      {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${sx},${sy})`,filter:"drop-shadow(0 4px 4px #0007)",offset:1}
    ],{duration:560,easing:"cubic-bezier(.19,.8,.24,1)",fill:"forwards"});
    animation.onfinish=()=>complete.current();
    return ()=>{animation.onfinish=null;animation.cancel();};
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
    const clearFx=()=>{
      animatedCards.forEach(card=>card.classList.remove("board-gs-archiving"));
      archiveTargets.forEach(target=>target.classList.remove("board-gs-archive-target"));
    };
    const cards=Array.from(arena.querySelectorAll<HTMLElement>(".board-slot .played-card"));
    for(let i=0;i<cards.length;i++){
      const card=cards[i];
      const parent=card.closest<HTMLElement>(".board-slot");
      const destination=parent?.querySelector<HTMLElement>(".archive-count");
      if(!destination)continue;
      const a=card.getBoundingClientRect(),b=destination.getBoundingClientRect();
      if(!a.width||!a.height)continue;
      card.classList.add("board-gs-archiving");
      destination.classList.add("board-gs-archive-target");
      animatedCards.push(card);
      archiveTargets.add(destination);
      const dx=b.left+b.width/2-(a.left+a.width/2);
      const dy=b.top+b.height/2-(a.top+a.height/2);
      const animation=card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d(0,-12px,0) scale(1.035)",opacity:1,offset:.2},
        {transform:`translate3d(${dx}px,${dy}px,0) rotate(-5deg) scale(.14)`,opacity:.45,offset:.87},
        {transform:`translate3d(${dx}px,${dy+8}px,0) rotate(-5deg) scale(.08)`,opacity:0,offset:1}
      ],{duration:680,easing:"cubic-bezier(.26,.73,.27,1)",delay:i*65,fill:"forwards"});
      animations.push(animation);
    }
    // An unused third hand card is discarded, never placed in an Archive.
    const remaining=Array.from(document.querySelectorAll<HTMLElement>(".app-shell.board-redesign-v1 .hand-zone .hand-card"));
    const discard=document.querySelector<HTMLElement>(".hybrid-deck-object");
    const discardRect=discard?.getBoundingClientRect();
    for(let i=0;i<remaining.length;i++){
      const card=remaining[i],rect=card.getBoundingClientRect();
      const dx=discardRect?(discardRect.left+discardRect.width/2)-(rect.left+rect.width/2):170;
      const dy=discardRect?(discardRect.top+discardRect.height/2)-(rect.top+rect.height/2):70;
      animations.push(card.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1},
        {transform:`translate3d(${dx}px,${dy}px,0) rotate(12deg) scale(.25)`,opacity:0}
      ],{duration:520,delay:140+i*50,easing:"cubic-bezier(.3,.78,.32,1)",fill:"forwards"}));
    }
    let cancelled=false;
    if(animations.length===0){done.current();return;}
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{
      if(!cancelled){clearFx();done.current();}
    });
    return ()=>{cancelled=true;animations.forEach(a=>a.cancel());clearFx();};
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
    const source=document.querySelector<HTMLElement>(".app-shell.board-redesign-v1 .hybrid-deck-object");
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
      ],{duration:440,delay:index*90,easing:"cubic-bezier(.2,.72,.29,1)",fill:"forwards"}));
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


type BoardSide="player"|"opponent";
interface BoardDamageTransferProps {
  attacker:BoardSide;
  victim:BoardSide;
  position:Position;
  reducedMotion:boolean;
}
/** A single restrained, physically aimed ink ribbon. It is mounted only if
 * the engine's already-resolved duel actually removed Champion Life.
 * The visible Life value is owned by GameState, never by the effect.
 */
export function BoardDamageTransfer({
  attacker,victim,position,reducedMotion
}:BoardDamageTransferProps){
  const [geometry,setGeometry]=useState<{path:string;width:number;height:number}|null>(null);
  useLayoutEffect(()=>{
    if(reducedMotion)return;
    const update=()=>{
      const root=document.querySelector(".app-shell.board-redesign-v1");
      if(!root){setGeometry(null);return;}
      const from=root.querySelector(
        `.board-slot.${attacker}[data-position="${position}"] .current-board-card`
      );
      const to=root.querySelector(`.hybrid-life-unit.${victim} .hybrid-life-crest`);
      const a=from?.getBoundingClientRect(),b=to?.getBoundingClientRect();
      if(!a||!b||!a.width||!b.width){setGeometry(null);return;}
      const x1=a.left+a.width/2,y1=a.top+a.height/2;
      const x2=b.left+b.width/2,y2=b.top+b.height/2;
      const cx=x1+(x2-x1)*.53,cy=y1+(y2-y1)*.53-32;
      setGeometry({
        path:`M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        width:window.innerWidth,height:window.innerHeight
      });
    };
    update();
    window.addEventListener("resize",update);
    return ()=>window.removeEventListener("resize",update);
  },[attacker,victim,position,reducedMotion]);
  if(reducedMotion||!geometry)return null;
  return <svg className="board-gs-damage-channel" aria-hidden="true"
    viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none">
    <path className="board-gs-channel-under" d={geometry.path} pathLength={100}/>
    <path className="board-gs-channel-line" d={geometry.path} pathLength={100}/>
  </svg>;
}
