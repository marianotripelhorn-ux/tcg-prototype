import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Application, BlurFilter, Container, Graphics } from "pixi.js";

export type Point = { x:number; y:number };
type ParticleMode = "scatter" | "suction" | "embers";
type Particle = {
  node:Graphics; x:number;y:number;vx:number;vy:number;
  life:number;ttl:number;gravity:number;drag:number;mode:ParticleMode;target?:Point;
};
type Pulse = { node:Graphics;life:number;ttl:number;radius:number; };
export interface FXController {
  burst(origin:Point,color:number,count:number,force?:number,mode?:ParticleMode,target?:Point):void;
  arc(from:Point,to:Point,color:number,width?:number):void;
  ring(origin:Point,color:number,radius?:number):void;
  clear():void;
  setPaused(value:boolean):void;
  setSpeed(value:number):void;
}
const cap=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const noop=()=>{};
const noopFx:FXController={
  burst:noop,arc:noop,ring:noop,clear:noop,setPaused:noop,setSpeed:noop
};

/**
 * PixiJS v8 is mounted only in the Animation Lab, above the unmodified React
 * card artwork. All effects use prebuilt Graphics primitives rather than
 * pixel-copying DOM card faces. An eventual shader can replace this layer.
 */
export const ParticleField=forwardRef<FXController,{onRenderer:(status:string)=>void}>(function ParticleField({onRenderer},ref){
  const holder=useRef<HTMLDivElement>(null);
  const engine=useRef<FXController>(noopFx);
  useImperativeHandle(ref,()=>({
    burst:(...args)=>engine.current.burst(...args),
    arc:(...args)=>engine.current.arc(...args),
    ring:(...args)=>engine.current.ring(...args),
    clear:()=>engine.current.clear(),
    setPaused:value=>engine.current.setPaused(value),
    setSpeed:value=>engine.current.setSpeed(value)
  }),[]);

  useEffect(()=>{
    const host=holder.current;
    if(!host)return;
    const app=new Application();
    let active=true,ready=false;
    let running=true,speed=1;
    const particles:Particle[]=[];
    const pulses:Pulse[]=[];
    let sharp:Container,glow:Container;

    const disposeParticles=()=>{
      for(const p of particles){p.node.parent?.removeChild(p.node);p.node.destroy();}
      for(const pulse of pulses){pulse.node.parent?.removeChild(pulse.node);pulse.node.destroy();}
      particles.length=0;pulses.length=0;
    };
    const frame=({deltaMS}:{deltaMS:number})=>{
      if(!active||!running)return;
      const dt=cap(deltaMS/16.666,0,2.5)*speed;
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.life-=dt;
        if(p.life<=0){
          p.node.parent?.removeChild(p.node);p.node.destroy();particles.splice(i,1);continue;
        }
        if(p.mode==="suction"&&p.target){
          const attract=Math.min(.18,.07*dt);
          p.vx+=(p.target.x-p.x)*attract*.065;
          p.vy+=(p.target.y-p.y)*attract*.065;
        }
        p.vx*=Math.pow(p.drag,dt);
        p.vy=p.vy*Math.pow(p.drag,dt)+p.gravity*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        p.node.position.set(p.x,p.y);
        p.node.rotation+=p.vx*.003*dt;
        const fraction=cap(p.life/p.ttl,0,1);
        p.node.alpha=Math.min(1,fraction*2.2);
        p.node.scale.set(.2+.8*fraction);
      }
      for(let i=pulses.length-1;i>=0;i--){
        const p=pulses[i];p.life-=dt;
        if(p.life<=0){p.node.parent?.removeChild(p.node);p.node.destroy();pulses.splice(i,1);continue;}
        const t=1-p.life/p.ttl;
        p.node.alpha=(1-t)*(1-t);
        p.node.scale.set(.35+t*1.45);
      }
    };

    (async()=>{
      try {
        await app.init({
          resizeTo:host,backgroundAlpha:0,antialias:true,
          autoDensity:true,resolution:Math.min(2,window.devicePixelRatio||1),
          preference:"webgl",powerPreference:"high-performance"
        });
        ready=true;
        if(!active){app.destroy({removeView:true},{children:true});return;}
        app.canvas.style.width="100%";app.canvas.style.height="100%";
        app.canvas.style.display="block";
        host.appendChild(app.canvas);
        glow=new Container();
        glow.filters=[new BlurFilter({strength:4,quality:2})];
        glow.blendMode="add";
        sharp=new Container();
        sharp.blendMode="add";
        app.stage.addChild(glow,sharp);
        app.ticker.add(frame);
        engine.current={
          burst:(origin,color,count,force=1,mode="scatter",target)=>{
            const amount=Math.min(210,Math.max(0,Math.round(count)));
            for(let i=0;i<amount;i++){
              if(particles.length>=320)break;
              const angle=Math.random()*Math.PI*2;
              const spread=mode==="suction"?24:6;
              const radius=Math.random()*spread;
              const size=(.65+Math.random()*2.15)*Math.min(1.7,force);
              const streak=Math.random()>.65;
              const node=new Graphics();
              if(streak){
                node.roundRect(-size*.32,-size*1.9,size*.64,size*3.8,size*.25)
                  .fill({color,alpha:.9});
              }else{
                node.circle(0,0,size).fill({color,alpha:1});
              }
              if(Math.random()>.75){
                node.circle(0,0,size*2.8).fill({color,alpha:.15});
              }
              const x=origin.x+Math.cos(angle)*radius;
              const y=origin.y+Math.sin(angle)*radius;
              node.position.set(x,y);node.rotation=angle;
              (Math.random()>.64?glow:sharp).addChild(node);
              const velocity=(1.7+Math.random()*5.1)*force;
              particles.push({
                node,x,y,
                vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,
                life:24+Math.random()*42,ttl:66,
                gravity:mode==="embers"?.10:mode==="suction"?-.015:.016,
                drag:mode==="suction"?.97:.982,mode,target
              });
            }
          },
          arc:(from,to,color,width=1.8)=>{
            const path:Point[]=[from];
            const dx=to.x-from.x,dy=to.y-from.y;
            const norm=Math.max(1,Math.hypot(dx,dy));
            const segments=Math.max(5,Math.ceil(norm/18));
            for(let k=1;k<segments;k++){
              const t=k/segments;
              const deviation=(Math.random()-.5)*Math.min(25,norm*.075);
              path.push({x:from.x+dx*t-dy/norm*deviation,y:from.y+dy*t+dx/norm*deviation});
            }
            path.push(to);
            const add=(w:number,alpha:number,container:Container)=>{
              const g=new Graphics();
              g.moveTo(path[0].x,path[0].y);
              path.slice(1).forEach(p=>g.lineTo(p.x,p.y));
              g.stroke({color,width:w,alpha,cap:"round",join:"round"});
              container.addChild(g);
              pulses.push({node:g,life:11+Math.random()*5,ttl:16,radius:1});
            };
            add(width*5,.16,glow);add(width,.85,sharp);
          },
          ring:(origin,color,radius=32)=>{
            const g=new Graphics()
              .circle(0,0,radius).stroke({color,width:2,alpha:.85})
              .circle(0,0,radius*.92).stroke({color,width:6,alpha:.16});
            g.position.set(origin.x,origin.y);
            glow.addChild(g);
            pulses.push({node:g,life:25,ttl:25,radius});
          },
          clear:disposeParticles,
          setPaused:value=>{running=!value;},
          setSpeed:value=>{speed=cap(value,.15,3);}
        };
        onRenderer("PixiJS WebGL · efectos GPU activos");
      } catch(error){
        // The GSAP/DOM motion experiments remain usable without a GPU context.
        onRenderer("Sin WebGL · efectos de partículas no disponibles");
        if(ready)app.destroy({removeView:true},{children:true});
        ready=false;
      }
    })();

    return ()=>{
      active=false;
      engine.current=noopFx;
      if(ready){
        app.ticker.remove(frame);
        disposeParticles();
        app.destroy({removeView:true},{children:true});
      }
    };
  },[onRenderer]);
  return <div ref={holder} className="lab-pixi-layer" aria-hidden="true"/>;
});
