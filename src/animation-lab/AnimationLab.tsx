import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CardFace } from "../App";
import { byId, cardsByFaction, factionLabels } from "../data";
import { championBackgroundUrl, championImageUrl } from "../championArtwork";
import type { Faction } from "../types";
import { ParticleField, type FXController, type Point } from "./ParticleField";
import { chiralWaveMask,clamp01 } from "./chiralWave";

type EffectId="chiral-wave"|"chiral-seal"|"spectral"|"summon"|"archive"|"placement"|"power"|"damage"|"banner";
type Flavor="arcane"|"gold";
type Demo={id:EffectId;label:string;description:string;principle:string;duration:string};
const demos:Demo[]=[
  {id:"chiral-wave",label:"01 · Marea Quiral (v2)",duration:"~ 2,0 s",description:"Dos masas de color sólido se encuentran, saturan la carta y se pliegan en una línea de luz.",principle:"Contención → fuerzas opuestas → colisión → desaparición limpia. Sin lluvia de partículas."},
  {id:"chiral-seal",label:"02 · Sello de Poder (v2)",duration:"~ 1,9 s",description:"Un color llena el material desde los extremos, surge un sello central y una onda se propaga por la piedra.",principle:"El Poder debe sentirse como una transformación física y controlada, sin destruir la carta."},
  {id:"spectral",label:"01 · Disolución etérea",duration:"~ 1,7 s",description:"La carta se electrifica, se convierte en una silueta luminosa y se deshace en hebras de energía.",principle:"Basado en la referencia: imagen → energía en el marco → silueta → filamentos → disipación."},
  {id:"summon",label:"02 · Materialización",duration:"~ 1,6 s",description:"Filamentos eléctricos convergen y reconstruyen la carta desde un contorno spectral.",principle:"La carta se reconstruye de energía antes de convertirse en un objeto físico."},
  {id:"archive",label:"01 · Archivo",duration:"1,6 s",description:"Transmutación, fragmentos de luz y absorción hacia el Archivo.",principle:"La carta debe parecer almacenada, no destruida."},
  {id:"placement",label:"02 · Colocación",duration:"1,2 s",description:"Trayectoria, elevación, sombra móvil, contacto y asentamiento.",principle:"El peso debe sentirse antes que la magia."},
  {id:"power",label:"03 · Poder",duration:"1,5 s",description:"Energía que recorre la carta y activa su valor de Poder.",principle:"El cambio de número debe sentirse causado por la carta."},
  {id:"damage",label:"04 · Impacto",duration:"1,4 s",description:"Transferencia de energía, impacto y pérdida visible de Vida.",principle:"El golpe debe conectar la carta ganadora con la corona."},
  {id:"banner",label:"05 · Estandarte",duration:"1,2 s",description:"Capas de tela, revelado del texto y entrada del personaje.",principle:"Un estandarte físico, no un panel que cambia de tamaño."}
];
const cards:Record<Faction,string>={
  red:"maestro_armas",blue:"asesino_sinistral",white:"gusano_blanco",
  saints:"santo_bifronte",ivory:"guardia_constelada"
};
const colors:{[key in Flavor]:number}={arcane:0x91e9e8,gold:0xffd18a};
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
function jaggedDissolve(progress:number):string{
  const edge=100-progress*109;
  const points=["0% 0%","100% 0%"];
  for(let step=12;step>=0;step--){
    const x=step/12*100;
    const noise=(Math.sin(step*2.17+progress*12)*3.6+Math.cos(step*4.91+progress*6)*2.4)*(Math.sin(progress*Math.PI)*.85+.2);
    points.push(`${x.toFixed(2)}% ${clamp(edge+noise,0,100).toFixed(2)}%`);
  }
  return "polygon("+points.join(",")+")";
}
export default function AnimationLab(){
  const [effect,setEffect]=useState<EffectId>("chiral-wave");
  const [faction,setFaction]=useState<Faction>("red");
  const [cardId,setCardId]=useState(cards.red);
  const [flavor,setFlavor]=useState<Flavor>("gold");
  const [speed,setSpeed]=useState(1);
  const [intensity,setIntensity]=useState(1.15);
  const [playing,setPlaying]=useState(false);
  const [paused,setPaused]=useState(false);
  const [renderer,setRenderer]=useState("Inicializando PixiJS…");
  const [info,setInfo]=useState("Dos fuerzas. Una superficie. Ninguna partícula en los nuevos estudios.");
  const [allowMotion,setAllowMotion]=useState(()=>!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const stage=useRef<HTMLDivElement>(null);
  const card=useRef<HTMLDivElement>(null);
  const halo=useRef<HTMLDivElement>(null);
  const spectralRig=useRef<HTMLDivElement>(null);
  const spectralGhost=useRef<HTMLDivElement>(null);
  const spectralEnergy=useRef<HTMLDivElement>(null);
  const spectralEdge=useRef<SVGSVGElement>(null);
  const chiralSurface=useRef<HTMLDivElement>(null);
  const chiralLeft=useRef<HTMLDivElement>(null);
  const chiralRight=useRef<HTMLDivElement>(null);
  const chiralAxis=useRef<HTMLDivElement>(null);
  const chiralSolid=useRef<HTMLDivElement>(null);
  const chiralSeal=useRef<SVGSVGElement>(null);
  const chiralSheen=useRef<HTMLDivElement>(null);
  const chiralStoneWave=useRef<HTMLDivElement>(null);
  const archive=useRef<HTMLDivElement>(null);
  const archiveValue=useRef<HTMLElement>(null);
  const power=useRef<HTMLDivElement>(null);
  const powerValue=useRef<HTMLElement>(null);
  const life=useRef<HTMLDivElement>(null);
  const lifeValue=useRef<HTMLElement>(null);
  const banner=useRef<HTMLDivElement>(null);
  const bannerBody=useRef<HTMLDivElement>(null);
  const bannerFigure=useRef<HTMLImageElement>(null);
  const flash=useRef<HTMLDivElement>(null);
  const progress=useRef<HTMLDivElement>(null);
  const timeline=useRef<gsap.core.Timeline|null>(null);
  const fx=useRef<FXController>(null);
  const selected=demos.find(d=>d.id===effect)!;
  const currentCard=byId(cardId);

  const point=(element:Element|null):Point=>{
    const bounds=element?.getBoundingClientRect();
    const base=stage.current?.getBoundingClientRect();
    if(!bounds||!base)return {x:0,y:0};
    return {x:bounds.left+bounds.width/2-base.left,y:bounds.top+bounds.height/2-base.top};
  };
  function reset(){
    timeline.current?.kill();
    timeline.current=null;
    fx.current?.clear();
    fx.current?.setPaused(false);
    setPlaying(false);setPaused(false);
    if(progress.current)progress.current.style.width="0%";
    if(archiveValue.current)archiveValue.current.textContent="3";
    if(powerValue.current)powerValue.current.textContent=String(currentCard.power);
    if(lifeValue.current)lifeValue.current.textContent="9";
    gsap.set(card.current,{x:0,y:0,scale:1,rotation:0,autoAlpha:effect==="banner"||effect==="summon"?0:1,filter:"brightness(1)",clipPath:"none"});
    gsap.set(spectralRig.current,{x:0,y:0,rotation:0,scale:1,filter:"none"});
    gsap.set(spectralGhost.current,{autoAlpha:0,scale:1,clipPath:"none",filter:"none"});
    gsap.set(spectralEnergy.current,{autoAlpha:0,scale:1,rotation:-14,xPercent:-38});
    gsap.set(spectralEdge.current,{autoAlpha:0,scale:1,rotation:0});
    gsap.set(chiralSurface.current,{autoAlpha:0,scaleX:1,transformOrigin:"center center"});
    gsap.set(chiralLeft.current,{opacity:1,clipPath:chiralWaveMask("left",0)});
    gsap.set(chiralRight.current,{opacity:1,clipPath:chiralWaveMask("right",0)});
    gsap.set(chiralAxis.current,{autoAlpha:0,scaleY:.05});
    gsap.set(chiralSolid.current,{autoAlpha:0});
    gsap.set(chiralSeal.current,{autoAlpha:0,scale:.62,rotation:0});
    gsap.set(chiralSheen.current,{autoAlpha:0,xPercent:-95});
    gsap.set(chiralStoneWave.current,{autoAlpha:0,xPercent:-50,yPercent:-50,scaleX:.12});
    gsap.set(halo.current,{autoAlpha:0,scale:.6,rotation:0});
    gsap.set(flash.current,{autoAlpha:0,scale:1});
    gsap.set(archive.current,{autoAlpha:effect==="archive"?1:0,scale:1,rotation:0});
    gsap.set(power.current,{autoAlpha:effect==="power"||effect==="chiral-seal"?1:0,scale:1,y:0});
    gsap.set(life.current,{autoAlpha:effect==="damage"?1:0,scale:1,x:0,y:0,rotation:0});
    gsap.set(banner.current,{autoAlpha:effect==="banner"?1:0,scaleY:1,rotation:0,clipPath:"none"});
    gsap.set(bannerBody.current,{autoAlpha:effect==="banner"?1:0,y:0});
    gsap.set(bannerFigure.current,{autoAlpha:effect==="banner"?1:0,y:0,x:0,scale:1});
  }
  useEffect(()=>{
    reset();
    return ()=>{timeline.current?.kill();fx.current?.clear();};
    // Reset for each explicitly selected demo, palette and physical card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[effect,faction,flavor,cardId]);

  function run(){
    reset();
    const c=card.current,h=halo.current, a=archive.current, pow=power.current,
      rig=spectralRig.current,ghost=spectralGhost.current,veins=spectralEnergy.current,edge=spectralEdge.current,
      mass=chiralSurface.current,leftMass=chiralLeft.current,rightMass=chiralRight.current,
      axis=chiralAxis.current,flood=chiralSolid.current,seal=chiralSeal.current,
      sheen=chiralSheen.current,stone=chiralStoneWave.current,
      crown=life.current,b=banner.current,bBody=bannerBody.current,fig=bannerFigure.current,fl=flash.current;
    if(!c||!h||!a||!pow||!crown||!b||!bBody||!fig||!fl||!rig||!ghost||!veins||!edge||!mass||!leftMass||!rightMass||!axis||!flood||!seal||!sheen||!stone)return;
    const activeColor=colors[flavor];
    const burst=(p:Point,n:number,force=1,mode:"scatter"|"suction"|"embers"="scatter",target?:Point)=>
      fx.current?.burst(p,activeColor,Math.round(n*intensity),force,mode,target);
    const arc=(p:Point,q:Point,width=2)=>fx.current?.arc(p,q,activeColor,width*intensity);
    const ring=(p:Point,r=34)=>fx.current?.ring(p,activeColor,r*intensity);
    const pCard=()=>point(c),pArchive=()=>point(a),pCrown=()=>point(crown),pPower=()=>point(pow);
    const tl=gsap.timeline({
      paused:true,
      defaults:{ease:"power2.out"},
      onUpdate:()=>{if(progress.current)progress.current.style.width=(tl.progress()*100).toFixed(1)+"%";},
      onComplete:()=>{setPlaying(false);setPaused(false);setInfo("EFECTO COMPLETADO · Podés repetirlo o cambiar los parámetros.");}
    });
    timeline.current=tl;
    setInfo(selected.principle);
    setPlaying(true);setPaused(false);
    fx.current?.setSpeed(speed);
    fx.current?.setPaused(false);

    if(!allowMotion){
      tl.to(c,{opacity:1,duration:.18}).to(fl,{autoAlpha:.55,duration:.13}).to(fl,{autoAlpha:0,duration:.13});
      tl.timeScale(2).play();return;
    }
    if(effect==="chiral-wave"||effect==="chiral-seal"){
      // This is deliberate, dense graphic motion: two opposing color surfaces
      // replace the earlier scatter of particles. No random FX are emitted.
      const leftFront={progress:0},rightFront={progress:0};
      const paint=()=>{
        leftMass.style.clipPath=chiralWaveMask("left",leftFront.progress);
        rightMass.style.clipPath=chiralWaveMask("right",rightFront.progress);
      };
      const opacity=clamp01(.72+.15*intensity);
      const charge=effect==="chiral-seal";
      const counter={value:currentCard.power};
      gsap.set(mass,{autoAlpha:1,scaleX:1});
      gsap.set(leftMass,{opacity});gsap.set(rightMass,{opacity});
      gsap.set(c,{filter:"brightness(1) saturate(1)"});
      tl.to(rig,{y:-8,scale:1.024,duration:.28,ease:"power2.out"})
        .to(h,{autoAlpha:.32,scale:1.06,duration:.26},"-=.17")
        .to(edge,{autoAlpha:.38,duration:.23},"<")
        // The fronts approach with a small temporal offset. Their shapes are
        // deterministic curves, so the same timing feels designed on replay.
        .to(leftFront,{progress:1,duration:.61,ease:"power2.inOut",onUpdate:paint},"-=.07")
        .to(rightFront,{progress:1,duration:.59,ease:"power2.inOut",onUpdate:paint},"<+=.065")
        .to(axis,{autoAlpha:.98,scaleY:1,duration:.22,ease:"power2.out"},"-=.19")
        .to(seal,{autoAlpha:.98,scale:1,duration:.32,ease:"back.out(1.65)"},"-=.18")
        .to(sheen,{autoAlpha:.58,xPercent:85,duration:.31,ease:"power2.inOut"},"-=.20")
        .to(flood,{autoAlpha:clamp01(.58+.2*intensity),duration:.22},"-=.15")
        .to(stone,{autoAlpha:.47,scaleX:2.0,duration:.27,ease:"power2.out"},"<")
        .to(stone,{autoAlpha:0,scaleX:3.45,duration:.45,ease:"power3.out"},"-=.04");

      if(charge){
        tl.to(flood,{autoAlpha:.24,duration:.20},"-=.20")
          .to(counter,{value:currentCard.power+3,duration:.30,roundProps:"value",
            onUpdate:()=>{if(powerValue.current)powerValue.current.textContent=String(counter.value);}},"-=.18")
          .to(pow,{scale:1.16,y:-7,duration:.18,ease:"back.out(1.5)"},"<")
          .to(pow,{scale:1,y:0,duration:.26,ease:"power2.out"})
          .to(leftFront,{progress:0,duration:.46,ease:"power2.inOut",onUpdate:paint},"-=.25")
          .to(rightFront,{progress:0,duration:.46,ease:"power2.inOut",onUpdate:paint},"<")
          .to(flood,{autoAlpha:0,duration:.37},"<")
          .to(axis,{autoAlpha:0,scaleY:.12,duration:.30},"<")
          .to(seal,{autoAlpha:0,scale:1.25,duration:.34},"<")
          .to(mass,{autoAlpha:0,duration:.12},"-=.08")
          .to(rig,{y:0,scale:1,duration:.32,ease:"power2.out"},"-=.1")
          .to(h,{autoAlpha:0,duration:.22},"<")
          .to(edge,{autoAlpha:0,duration:.16},"<");
      } else {
        tl.to(c,{autoAlpha:0,duration:.14},"-=.24")
          // The resulting color plate folds into a single thin bright line.
          .to(mass,{scaleX:.024,duration:.46,ease:"power3.inOut"},"-=.07")
          .to(seal,{scale:.78,autoAlpha:0,duration:.26},"-=.32")
          .to(axis,{autoAlpha:.82,scaleY:1.10,duration:.22},"<")
          .to(mass,{autoAlpha:0,duration:.16},"+=.06")
          .to(axis,{autoAlpha:0,scaleY:0,duration:.28},"<")
          .to(edge,{autoAlpha:0,duration:.23},"<")
          .to(h,{autoAlpha:0,scale:1.22,duration:.35},"-=.18");
      }
    }
    if(effect==="spectral"){
      const start=pCard();
      const base=stage.current?.getBoundingClientRect();
      const destination:Point={x:start.x-Math.min(240,(base?.width??800)*.29),
        y:start.y+Math.min(220,(base?.height??600)*.31)};
      // Its final motion is deliberately down and left, like the supplied
      // frame-by-frame reference, rather than into an invented game zone.
      const perimeter=(count:number,attract=false)=>{
        const rect=c.getBoundingClientRect(),root=stage.current?.getBoundingClientRect();
        if(!root)return;
        for(let i=0;i<count;i++){
          const u=Math.random(),edgeIndex=i%4;
          const x=edgeIndex===0?rect.left+u*rect.width:
            edgeIndex===1?rect.right:edgeIndex===2?rect.left+u*rect.width:rect.left;
          const y=edgeIndex===0?rect.top:edgeIndex===1?rect.top+u*rect.height:
            edgeIndex===2?rect.bottom:rect.top+u*rect.height;
          burst({x:x-root.left,y:y-root.top},3,attract?.7:.9,
            attract?"suction":"scatter",destination);
        }
      };
      const dissolve={value:0};
      const ghostDissolve={value:0};
      tl.to(rig,{y:-11,scale:1.032,rotation:-.6,duration:.28,ease:"power2.out"})
        .to(h,{autoAlpha:1,scale:1.12,duration:.28},"-=.15")
        .to(edge,{autoAlpha:1,scale:1.015,duration:.18},"-=.15")
        .call(()=>{perimeter(18);ring(start,85);},undefined,"<")
        .to(veins,{autoAlpha:.91,xPercent:28,duration:.40,ease:"power2.inOut"},"-=.1")
        .call(()=>{
          const p=pCard();
          for(let k=0;k<5;k++){
            const side=k%2?1:-1;
            arc({x:p.x-90*side,y:p.y-116+k*17},
              {x:p.x+79*side,y:p.y+100-k*8},1.6);
          }
          burst(p,56,1.12);
        },undefined,"-=.25")
        .to(c,{filter:"brightness(1.72) saturate(1.45)",duration:.21},"-=.32")
        .to(ghost,{autoAlpha:.86,filter:"brightness(1.1)",duration:.21},"-=.15")
        .to(dissolve,{value:1,duration:.59,ease:"power2.in",
          onUpdate:()=>{
            c.style.clipPath=jaggedDissolve(dissolve.value);
            if(Math.random()<.5)perimeter(2,true);
          }},"-=.09")
        .to(c,{autoAlpha:0,duration:.06},"-=.12")
        .call(()=>{perimeter(24,true);ring(pCard(),76);},undefined,"<")
        .to(veins,{autoAlpha:1,xPercent:-34,duration:.24},"<")
        .call(()=>{
          const p=pCard();
          for(let k=0;k<6;k++){
            const from={x:p.x-70+k*28,y:p.y+40+(k%3)*36};
            const to={x:destination.x-26+k*10,y:destination.y-(k%2)*46};
            arc(from,to,k%2?1.3:2.3);
            burst(from,9,1.1,"suction",destination);
          }
          burst(destination,55,.9,"scatter");
        },undefined,"+=.06")
        .to(ghostDissolve,{value:1,duration:.41,
          onUpdate:()=>{ghost.style.clipPath=jaggedDissolve(ghostDissolve.value);}},"<")
        .to(ghost,{autoAlpha:0,y:-19,duration:.38,ease:"power2.in"},"<")
        .to(veins,{autoAlpha:0,rotation:11,xPercent:-90,duration:.39},"<")
        .to(edge,{autoAlpha:0,scale:1.09,duration:.42},"<")
        .to(h,{autoAlpha:0,scale:1.33,duration:.48},"-=.28");
    }
    if(effect==="summon"){
      const center=pCard(),base=stage.current?.getBoundingClientRect();
      const source:Point={x:center.x-Math.min(240,(base?.width??800)*.27),
        y:center.y+Math.min(200,(base?.height??600)*.28)};
      const restoration={value:1};
      gsap.set(c,{autoAlpha:0,clipPath:jaggedDissolve(1),filter:"brightness(1.95) saturate(1.3)"});
      gsap.set(edge,{autoAlpha:0,scale:.96});
      gsap.set(ghost,{autoAlpha:0,clipPath:"none"});
      gsap.set(veins,{autoAlpha:0,xPercent:-80});
      gsap.set(rig,{scale:.94,y:16,rotation:1.6});
      tl.call(()=>{
          for(let k=0;k<5;k++){
            const destination={x:center.x-75+k*37,y:center.y+78-k*25};
            arc({x:source.x-35+k*14,y:source.y+(k%2)*32},destination,1.6+(k%2));
          }
          burst(source,55,1.1,"suction",center);ring(source,40);
        })
        .to(edge,{autoAlpha:1,scale:1.04,duration:.26,ease:"power2.out"},"+=.12")
        .to(ghost,{autoAlpha:.87,duration:.23},"-=.18")
        .to(veins,{autoAlpha:.96,xPercent:14,duration:.48},"<")
        .call(()=>{
          const p=pCard();
          burst(p,90,.77);ring(p,97);
          for(let k=0;k<4;k++)arc(
            {x:p.x-85+k*38,y:p.y-98},
            {x:p.x+80-k*26,y:p.y+112},1.5);
        },undefined,"-=.17")
        .to(restoration,{value:0,duration:.66,ease:"power2.inOut",
          onStart:()=>{gsap.set(c,{autoAlpha:1});},
          onUpdate:()=>{c.style.clipPath=jaggedDissolve(restoration.value);}},"-=.08")
        .to(c,{filter:"brightness(1) saturate(1)",duration:.35},"-=.22")
        .to(rig,{scale:1.035,y:-7,rotation:-.8,duration:.22,ease:"power2.out"},"-=.27")
        .call(()=>{ring(pCard(),71);burst(pCard(),55,.78,"embers");},undefined,"<")
        .to(edge,{autoAlpha:0,scale:1.12,duration:.36},"<")
        .to(veins,{autoAlpha:0,xPercent:65,duration:.3},"<")
        .to(ghost,{autoAlpha:0,duration:.22},"<")
        .to(rig,{scale:1,y:0,rotation:0,duration:.34,ease:"back.out(1.9)"},"-=.12")
        .to(h,{autoAlpha:0,duration:.1},"<");
    }
    if(effect==="placement"){
      const width=stage.current?.clientWidth??950;
      const height=stage.current?.clientHeight??600;
      gsap.set(c,{x:-Math.min(width*.33,340),y:Math.min(height*.29,170),rotation:-14,scale:.53,filter:"brightness(.77) drop-shadow(4px 10px 6px #0007)"});
      tl.to(c,{x:-38,y:-39,rotation:4.4,scale:1.045,filter:"brightness(1.08) drop-shadow(14px 23px 14px #0008)",duration:.67,ease:"power3.inOut"})
        .call(()=>{ring(pCard(),64);burst(pCard(),32,1.1);},undefined,"-=.05")
        .to(c,{x:5,y:7,rotation:-1.5,scale:.975,duration:.16,ease:"power3.in"})
        .call(()=>{ring(pCard(),53);burst(pCard(),27,.7,"embers");},undefined,"<")
        .to(c,{x:0,y:0,rotation:0,scale:1,filter:"brightness(1) drop-shadow(3px 9px 9px #0006)",duration:.26,ease:"back.out(2.5)"});
    }
    if(effect==="power"){
      const counter={value:currentCard.power};
      const target=currentCard.power+3;
      tl.to(c,{y:-9,scale:1.045,filter:"brightness(1.1) drop-shadow(0 13px 17px #0008)",duration:.24})
        .call(()=>{
          const center=pCard();
          ring(center,99);burst(center,48,.72);
          for(let k=0;k<5;k++){
            const t=k/4;
            arc({x:center.x-75+t*38,y:center.y-100},{x:center.x+25+t*28,y:center.y+90},1.7);
          }
        },undefined,"<")
        .to(h,{autoAlpha:.95,scale:1.1,duration:.32,ease:"power2.out"},"<")
        .to(counter,{value:target,duration:.73,ease:"power3.out",roundProps:"value",
          onUpdate:()=>{if(powerValue.current)powerValue.current.textContent=String(counter.value);}},"-=.08")
        .call(()=>{const center=pPower();ring(center,48);burst(center,68,1.2);},undefined,"-=.18")
        .to(pow,{y:-6,scale:1.18,duration:.16,ease:"back.out(2)"}, "<")
        .to(pow,{y:0,scale:1,duration:.23})
        .to(h,{autoAlpha:0,scale:1.34,duration:.37},"-=.2")
        .to(c,{y:0,scale:1,filter:"brightness(1)",duration:.3},"<");
    }
    if(effect==="archive"){
      const start=pCard(),end=pArchive();
      gsap.set(h,{autoAlpha:.08,scale:.7});
      const dissolution={value:0};
      tl.to(c,{y:-9,scale:1.035,filter:"brightness(1.35) drop-shadow(0 20px 18px #0009)",duration:.24})
        .call(()=>{ring(start,85);burst(start,65,1.05);arc({x:start.x-85,y:start.y-110},{x:start.x+85,y:start.y+110},2.5)},undefined,"-=.12")
        .to(h,{autoAlpha:1,scale:1.08,duration:.29},"<")
        .to(dissolution,{value:1,duration:.76,ease:"power2.inOut",
          onUpdate:()=>{
            const v=dissolution;
            c.style.clipPath=jaggedDissolve(v.value);
            if(Math.random()<.48){
              const box=c.getBoundingClientRect(),base=stage.current!.getBoundingClientRect();
              const p:Point={x:box.left-base.left+box.width*Math.random(),
                y:box.top-base.top+box.height*clamp(1-v.value,0,1)};
              burst(p,2,.55,"suction",end);
            }
          }},"-=.06")
        .to(c,{x:end.x-start.x,y:end.y-start.y,rotation:-11,scale:.23,opacity:.08,duration:.78,ease:"power3.in"},"<")
        .call(()=>{arc(pCard(),end,3.3);burst(end,84,1.18,"scatter");ring(end,43)},undefined,"-=.1")
        .to(c,{autoAlpha:0,duration:.07})
        .to(a,{scale:1.18,duration:.12,ease:"power2.out"},"<")
        .call(()=>{if(archiveValue.current)archiveValue.current.textContent="4";})
        .to(a,{scale:1,duration:.26,ease:"back.out(3)"})
        .to(h,{autoAlpha:0,duration:.2},"-=.2");
    }
    if(effect==="damage"){
      const start=pCard(),end=pCrown();
      const counter={value:9};
      tl.to(c,{y:-6,scale:1.045,filter:"brightness(1.14)",duration:.26})
        .call(()=>{ring(start,56);burst(start,32,.84);},undefined,"-=.05")
        .call(()=>{
          arc(start,end,4.2);
          arc({x:start.x+25,y:start.y-35},{x:end.x-12,y:end.y+10},1.5);
          for(let i=0;i<4;i++){
            const t=i/4;
            burst({x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t},9,.8);
          }
        },undefined,"+=.09")
        .to(fl,{autoAlpha:.65,duration:.08},"<")
        .to(fl,{autoAlpha:0,duration:.24})
        .to(crown,{x:7,rotation:3,scale:1.1,duration:.09},"<")
        .call(()=>{ring(end,67);burst(end,75,1.35);},undefined,"<")
        .to(counter,{value:8,duration:.11,roundProps:"value",onUpdate:()=>{if(lifeValue.current)lifeValue.current.textContent=String(counter.value);}},"<")
        .to(crown,{x:-7,rotation:-3,duration:.085})
        .to(crown,{x:3,rotation:1.2,scale:1.02,duration:.11})
        .to(crown,{x:0,rotation:0,scale:1,duration:.32,ease:"elastic.out(1,.45)"})
        .to(c,{y:0,scale:1,filter:"brightness(1)",duration:.25},"-=.26");
    }
    if(effect==="banner"){
      gsap.set(b,{scaleY:.26,transformOrigin:"center top",clipPath:"polygon(0 0,100% 0,100% 74%,50% 85%,0 74%)",opacity:.5});
      gsap.set(bBody,{y:-25,autoAlpha:0});
      gsap.set(fig,{y:95,scale:.88,autoAlpha:0});
      tl.to(b,{scaleY:1,autoAlpha:1,duration:.62,ease:"power3.out"})
        .to(b,{clipPath:"polygon(0 0,100% 0,100% 92%,50% 100%,0 92%)",duration:.45,ease:"power2.out"},"<")
        .call(()=>{ring(point(b),75);burst(point(b),22,.55)},undefined,"-=.32")
        .to(bBody,{y:0,autoAlpha:1,duration:.38,ease:"power2.out"},"-=.38")
        .to(fig,{y:0,scale:1,autoAlpha:1,duration:.48,ease:"back.out(1.45)"},"-=.32")
        .to(b,{rotation:-.5,duration:.08},"-=.05")
        .to(b,{rotation:0,duration:.22,ease:"sine.out"});
    }
    tl.timeScale(speed).play();
  }

  function togglePause(){
    const tl=timeline.current;
    if(!tl||tl.progress()===1)return;
    if(tl.paused()){
      tl.play();setPaused(false);setPlaying(true);fx.current?.setPaused(false);
    }else{
      tl.pause();setPaused(true);fx.current?.setPaused(true);
    }
  }
  const changeSpeed=(next:number)=>{
    setSpeed(next);timeline.current?.timeScale(next);fx.current?.setSpeed(next);
  };
  const chooseEffect=(next:EffectId)=>{setEffect(next);setInfo("Efecto seleccionado · Presioná REPRODUCIR");};
  return <div className="animation-lab">
    <header className="lab-header">
      <div className="lab-brand"><strong>DAGGERLIGHT</strong><span>ANIMATION LAB <i>02</i></span></div>
      <div className="lab-header-actions">
        <span className="lab-renderer-status">{renderer}</span>
        <a href="./">VOLVER AL JUEGO <span aria-hidden="true">↗</span></a>
      </div>
    </header>
    <main className="lab-main">
      <aside className="lab-controls" aria-label="Controles del laboratorio">
        <p className="lab-kicker">MOTION SYSTEM / PROTOTIPO</p>
        <h1>Laboratorio de animaciones</h1>
        <p className="lab-lead">Pruebas visuales independientes. Ninguna modifica las reglas ni el tablero jugable.</p>
        <h2>01 / Elegí el efecto</h2>
        <p className="lab-identity-note">Nuevo estudio: ondas opuestas, masas de color y sellos. Los efectos anteriores siguen disponibles para comparar.</p>
        <div className="lab-effect-list">
          {demos.map(d=><button key={d.id} type="button"
            className={"lab-effect-option"+(effect===d.id?" selected":"")+(d.id.startsWith("chiral")?" is-v2":d.id==="spectral"?" is-legacy":"")}
            aria-pressed={effect===d.id} onClick={()=>chooseEffect(d.id)}>
              <span>{d.label}</span><small>{d.duration}</small>
            </button>)}
        </div>
        <h2>02 / Personalizá la prueba</h2>
        <label className="lab-field">Carta real de Daggerlight
          <select value={faction} onChange={event=>{const next=event.target.value as Faction;setFaction(next);setCardId(cards[next]);}}>
            {(["red","blue","white","saints","ivory"] as Faction[]).map(key=>
              <option value={key} key={key}>{factionLabels[key]}</option>)}
          </select>
        </label>
        <label className="lab-field">Carta para la prueba
          <select value={cardId} onChange={event=>setCardId(event.target.value)}>
            {cardsByFaction[faction].map(entry=><option key={entry.id} value={entry.id}>{entry.name} · Poder {entry.power}</option>)}
          </select>
        </label>
        <div className="lab-field"><span>Tratamiento de energía</span>
          <div className="lab-segments">
            <button type="button" className={flavor==="arcane"?"active":""} aria-pressed={flavor==="arcane"} onClick={()=>setFlavor("arcane")}>Arcano</button>
            <button type="button" className={flavor==="gold"?"active":""} aria-pressed={flavor==="gold"} onClick={()=>setFlavor("gold")}>Dorado</button>
          </div>
        </div>
        <label className="lab-field lab-slider">
          <span>Velocidad <strong>{speed.toFixed(2)}×</strong></span>
          <input type="range" min=".4" max="1.8" step=".05" value={speed} onChange={event=>changeSpeed(Number(event.target.value))}/>
        </label>
        <label className="lab-field lab-slider">
          <span>Intensidad <strong>{Math.round(intensity*100)}%</strong></span>
          <input type="range" min=".35" max="2" step=".05" value={intensity} onChange={event=>setIntensity(Number(event.target.value))}/>
        </label>
        {!allowMotion && <div className="lab-motion-notice">
          Tu sistema tiene movimiento reducido. Los efectos están limitados.
          <button onClick={()=>setAllowMotion(true)} type="button">Habilitar movimiento para estas pruebas</button>
        </div>}
        <p className="lab-access-note">Los efectos se activan manualmente. Ajustá los controles y repetí para comparar.</p>
      </aside>
      <section className="lab-workbench">
        <div className="lab-workbench-header">
          <div><span className="lab-kicker">ESCENA / {selected.id.toUpperCase()}</span><h2>{selected.label.substring(5)}</h2>
            <p>{selected.description}</p>
          </div>
          <span className="lab-chip">GSAP + PIXIJS 8</span>
        </div>
        <div className={"lab-stage flavor-"+flavor+" scene-"+effect} ref={stage} aria-label={"Escenario experimental: "+selected.description}>
          <div className="lab-stage-engraving" style={{backgroundImage:`url("${import.meta.env.BASE_URL}board/arena-compass-source.png")`}}/>
          <div className="lab-stage-axis"><span>SINIESTRA</span><span>TRONO</span><span>DIESTRA</span></div>
          <div className="lab-slot-mark" aria-hidden="true"/>
          <div className="lab-card-anchor">
            <div ref={spectralRig} className="lab-spectral-rig">
              <div ref={card} className="lab-card">
                <CardFace card={currentCard} />
              </div>
              <div ref={chiralSurface} className="lab-chiral-surface" aria-hidden="true">
                <div ref={chiralLeft} className="lab-chiral-paint lab-chiral-left"/>
                <div ref={chiralRight} className="lab-chiral-paint lab-chiral-right"/>
                <div ref={chiralSolid} className="lab-chiral-solid"/>
                <div ref={chiralAxis} className="lab-chiral-axis"/>
                <div ref={chiralSheen} className="lab-chiral-sheen"/>
                <svg ref={chiralSeal} className="lab-chiral-seal" viewBox="0 0 120 120" aria-hidden="true">
                  <path className="stroke-core" d="M60 6L113 60 60 114 7 60Z"/>
                  <path className="inner-ink" d="M60 26L94 60 60 94 26 60Z"/>
                  <path className="stroke-core" d="M60 38L82 60 60 82 38 60Z"/>
                  <path className="stroke-core" d="M60 6V114M7 60H113" strokeWidth="1.2"/>
                </svg>
              </div>
              <div ref={spectralGhost} className="lab-spectral-ghost" aria-hidden="true">
                <CardFace card={currentCard} />
              </div>
              <div ref={spectralEnergy} className="lab-spectral-energy" aria-hidden="true"/>
              <svg ref={spectralEdge} className="lab-spectral-etching"
                viewBox="0 0 210 294" preserveAspectRatio="none" aria-hidden="true">
                <rect x="4" y="4" width="202" height="286" rx="1" fill="none"
                  stroke="currentColor" strokeWidth="1.7"/>
                <rect x="9" y="9" width="192" height="276" rx="1" fill="none"
                  stroke="currentColor" strokeWidth=".7" opacity=".67"/>
                <path d="M4 47L4 4 43 4M167 4L206 4 206 47M4 248L4 290 43 290M167 290L206 290 206 248"
                  fill="none" stroke="currentColor" strokeWidth="3.4"/>
                <path d="M4 28L19 8 42 4M168 4L192 9 206 28M4 264L18 286 42 290M168 290L193 285 206 266"
                  fill="none" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M25 21L33 29 25 37 17 29Z M184 258L192 266 184 274 176 266Z"
                  fill="none" stroke="currentColor" strokeWidth=".8"/>
              </svg>
            </div>
            <div ref={halo} className="lab-card-halo" aria-hidden="true"/>
          </div>
          <div className="lab-archive-well" ref={archive}>
            <span>ARCHIVO</span><strong ref={archiveValue}>3</strong><small>TRONO · VOS</small>
          </div>
          <div className="lab-power-badge" ref={power}><span>PODER FINAL</span><strong ref={powerValue}>{currentCard.power}</strong><small>+3 EN ESTA PRUEBA</small></div>
          <div className="lab-life-holder" ref={life}><span>VIDA DEL RIVAL</span><div className="lab-life-crest"><strong ref={lifeValue}>9</strong></div></div>
          <div className="lab-banner" ref={banner} style={{backgroundImage:`url("${championBackgroundUrl("red")}")`}}>
            <div className="lab-banner-content" ref={bannerBody}>
              <small>CAMPEÓN · GUARDIA DEXTRAL</small><strong>MAJESTAD DEXTRAL</strong>
              <span>Rey de Latalia</span><p>Podés jugar dos cartas en Diestra.</p>
            </div>
            <img ref={bannerFigure} src={championImageUrl("dextral")} alt="" className="lab-banner-figure"/>
          </div>
          <div className="lab-chiral-stone-wave" ref={chiralStoneWave} aria-hidden="true"/>
          <div className="lab-stage-flash" ref={flash}/>
          <ParticleField ref={fx} onRenderer={setRenderer}/>
          <span className="lab-stage-watermark">DAGGERLIGHT / EFECTOS EN DESARROLLO</span>
        </div>
        <div className="lab-transport">
          <div className="lab-transport-buttons">
            <button type="button" className="lab-play" onClick={run}>▶ {playing?"REPETIR":"REPRODUCIR"}</button>
            <button type="button" disabled={!timeline.current || !playing} onClick={togglePause}>{paused?"▶ CONTINUAR":"Ⅱ PAUSAR"}</button>
            <button type="button" onClick={()=>{reset();setInfo("Prueba reiniciada.");}}>↺ REINICIAR</button>
          </div>
          <div className="lab-progress-track" aria-label="Progreso del efecto"><div ref={progress}/></div>
          <div className="lab-transport-caption" role="status">{info}</div>
        </div>
      </section>
    </main>
    <footer className="lab-footer">
      <span>React renderiza las cartas originales · GSAP coreografía los objetos · PixiJS dibuja energía y partículas</span>
      <span>NO CONECTADO AL MOTOR DE PARTIDA · ESCRITORIO PRIMERO</span>
    </footer>
  </div>;
}
