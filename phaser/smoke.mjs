import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port=4177;
const server=spawn(process.execPath,["./node_modules/vite/bin/vite.js","preview","--config","vite.phaser.config.ts","--host","127.0.0.1","--port",String(port),"--strictPort"],{
  stdio:["ignore","pipe","pipe"]
});
let logs="";
server.stdout.on("data",d=>logs+=String(d));
server.stderr.on("data",d=>logs+=String(d));
const errors=[];
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
async function waitReady(url){
 for(let i=0;i<40;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await delay(200);}
 throw new Error("Local preview server did not respond. "+logs);
}
try{
 await waitReady("http://127.0.0.1:"+port+"/");
 for(const [name,width,height] of [["desktop",1440,900],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:name==="mobile",hasTouch:name==="mobile",deviceScaleFactor:1});
  const runtimeErrors=[];
  page.on("pageerror",err=>runtimeErrors.push(err.stack||err.message));
  page.on("console",msg=>{if(msg.type()==="error")runtimeErrors.push("console: "+msg.text());});
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"load",timeout:20000});
  try{
   await page.waitForFunction(()=>document.documentElement.dataset.phaserReady==="true",null,{timeout:12000});
  }catch(e){
   const status=await page.locator("#boot-status").textContent();
   throw new Error(name+" never rendered. Status: "+status+"\n"+runtimeErrors.join("\n")+"\n"+logs);
  }
  const canvas=page.locator("#game canvas");
  if(await canvas.count()!==1)throw new Error(name+" has no Phaser canvas");
  const bounds=await canvas.boundingBox();
  if(!bounds||bounds.width<width*.75||bounds.height<height*.75)throw new Error(name+" canvas has incorrect dimensions: "+JSON.stringify(bounds));
  await page.screenshot({path:"phaser-"+name+".png",fullPage:true});
  const sceneSummary=await page.evaluate(()=>({
    canvas:Array.from(document.querySelectorAll("canvas")).map(node=>[node.width,node.height]),
    ready:document.documentElement.dataset.phaserReady
  }));
  console.log("PHASER_SCENE",name,JSON.stringify(sceneSummary));

  // Exercise the actual pointer path. Merely seeing a canvas is insufficient:
  // regressions used to allow clicking slots while dragging never worked.
  const readState=()=>page.evaluate(()=>window.__daggerlightPhaserDebug?.());
  const initial=await readState();
  if(!initial?.layout || initial.state.playerPlays.length || initial.state.hand.length!==3)throw new Error(name+" missing real game state or opening hand");
  const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
  const source=center(initial.layout.hand[0]);
  const destination=center(initial.layout.playerSlots.siniestra);

  if(name==="desktop"){
    await page.mouse.move(source.x,source.y);
    await page.mouse.down();
    await page.mouse.move(source.x,source.y-45,{steps:7});
    await page.mouse.move(destination.x,destination.y,{steps:14});
    const midway=await readState();
    if(midway.draggingIndex!==0||!midway.dragPosition ||
       Math.abs(midway.dragPosition.y-source.y)<50){
      throw new Error("Desktop card failed to follow pointer: "+JSON.stringify(midway));
    }
    await page.mouse.up();
  }else{
    const cdp=await page.context().newCDPSession(page);
    const touch=(type,x,y)=>cdp.send("Input.dispatchTouchEvent",{
      type,touchPoints:type==="touchEnd"?[]:[{x,y,id:1}]
    });
    await touch("touchStart",source.x,source.y);
    await delay(70);
    for(let i=1;i<=18;i++){
      const f=i/18;
      await touch("touchMove",source.x+(destination.x-source.x)*f,source.y+(destination.y-source.y)*f);
      await delay(22);
    }
    const midway=await readState();
    if(midway.draggingIndex!==0||!midway.dragPosition ||
       Math.abs(midway.dragPosition.y-source.y)<50){
      throw new Error("Mobile card failed to follow touch: "+JSON.stringify(midway));
    }
    await touch("touchEnd",destination.x,destination.y);
    await cdp.detach();
  }
  await page.waitForFunction(()=>
    window.__daggerlightPhaserDebug?.().state.playerPlays.some(([,lane])=>lane==="siniestra"),
    null,{timeout:2500});
  const after=await readState();
  if(after.state.playerPlays.length!==1 || after.state.opponentPlays.length!==1 || after.state.hand.length!==2)throw new Error(name+" did not resolve a real duel "+JSON.stringify(after.state));
  console.log("PHASER_DUEL_OK",name,"real card and AI resolved in siniestra");

  // A second card remains selectable with click/tap, independently from drag.
  const second=center(after.layout.hand[1]);
  const throne=center(after.layout.playerSlots.trono);
  if(name==="desktop"){
    await page.mouse.click(second.x,second.y);
    await page.mouse.click(throne.x,throne.y);
  }else{
    await page.touchscreen.tap(second.x,second.y);
    await page.touchscreen.tap(throne.x,throne.y);
  }
  await page.waitForFunction(()=>
    (s=>s.round>1 || s.turn===3 || s.phase!=="awaiting_player")(window.__daggerlightPhaserDebug?.().state),
    null,{timeout:2500});
  console.log("PHASER_TAP_OK",name,"second real duel resolved; phase or round advanced");
  if(runtimeErrors.some(error=>!/404|favicon|net::ERR/.test(error)))throw new Error(name+" browser errors: "+runtimeErrors.join("\n"));
  console.log("PHASER_SMOKE_OK "+name+" "+width+"x"+height+" canvas: "+Math.round(bounds.width)+"x"+Math.round(bounds.height));
  await page.close();
 }
 }finally{
  await browser.close();
  server.kill("SIGTERM");
  server.stdout.destroy();
  server.stderr.destroy();
}
