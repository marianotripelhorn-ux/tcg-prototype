/**
 * Daggerlight's opposing, physical color masses: the edges advance toward
 * one another without sparks or procedural noise. A soft wave is deliberately
 * asymmetric (chirality), but fully deterministic for reproducible art direction.
 *
 * Both surfaces use full-card polygons. Progress 0 = no fill; 1 = collision
 * around the central axis. No canvas snapshot or card-art alteration required.
 */
export type ChiralSide="left"|"right";
export const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
export function chiralWaveMask(side:ChiralSide,progress:number):string{
  const p=clamp01(progress);
  const base=(side==="left"?1:-1)*(p*52);
  const coords:string[]=[];
  const steps=24;
  // Wave amplitude grows during advance and subsides on contact; the fronts
  // must read as two broad fills, NOT electrical zigzags.
  const amplitude=2.8*Math.sin(Math.PI*p);
  for(let i=0;i<=steps;i++){
    const y=i/steps*100;
    const offset=amplitude*Math.sin((i/steps)*Math.PI*2.25+(side==="left"?.32:2.45));
    const x=side==="left"?Math.max(0,Math.min(100,base+offset)):
      Math.max(0,Math.min(100,100+base+offset));
    coords.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  if(side==="left"){
    return `polygon(0% 0%, ${coords.join(", ")}, 0% 100%)`;
  }
  return `polygon(100% 0%, ${coords.join(", ")}, 100% 100%)`;
}
