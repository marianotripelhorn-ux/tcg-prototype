import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const port=4183;
const server=spawn(process.execPath,["./node_modules/vite/bin/vite.js","preview","--config","vite.duelboard.config.ts","--host","127.0.0.1","--port",String(port),"--strictPort"],{
 stdio:["ignore","pipe","pipe"]
});
let output="";
server.stdout.on("data",d=>output+=String(d));
server.stderr.on("data",d=>output+=String(d));
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
const url="http://127.0.0.1:"+port+"/";
async function ready(){
 for(let i=0;i<50;i++){try{if((await fetch(url)).ok)return;}catch{}await delay(200);}
 throw new Error("Duelboard preview unavailable: "+output);
}
async function debug(page){return page.evaluate(()=>window.__daggerlightBoardDebug?.());}
async function assertPlay(page,lane,count=1){
 await page.waitForFunction(([target,amount])=>{
  const game=window.__daggerlightBoardDebug?.();
  return game && game.playerPlays.length>=amount && game.playerPlays.some(([,pos])=>pos===target);
 },[lane,count],{timeout:4000});
 const state=await debug(page);
 if(state.playerPlays.length!==count || state.opponentPlays.length!==count)throw new Error("Incorrect real duel "+JSON.stringify(state));
}
try{
 await ready();
 for(const [mode,width,height] of [["desktop",1440,900],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:mode==="mobile",hasTouch:mode==="mobile",deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.stack||e.message));
  page.on("console",m=>{if(m.type()==="error" && !/fonts.googleapis|fonts.gstatic/.test(m.text()))errors.push(m.text());});
  await page.goto(url,{waitUntil:"load",timeout:25000});
  await page.waitForFunction(()=>document.documentElement.dataset.boardReady==="true",null,{timeout:10000});
  const initial=await debug(page);
  if(!initial||initial.hand.length!==3||initial.playerLife!==9||initial.opponentLife!==9)throw new Error(mode+" no real opening game state "+JSON.stringify(initial));
  if(await page.locator(".duel-slot").count()!==6||await page.locator(".hand-card").count()!==3)throw new Error(mode+" board structural components missing");
  await page.waitForFunction(()=>Array.from(document.querySelectorAll(".champion-portrait img")).every(n=>n.complete && n.naturalWidth>0),null,{timeout:12000});
  const art=await page.locator(".hand-card .physical-card").first().evaluate(el=>getComputedStyle(el).backgroundImage);
  if(!art.includes("cards/v4/"))throw new Error(mode+" real Card Studio art not connected "+art);
  const render=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,viewport:[innerWidth,innerHeight]}));
  if(render.w>width+3)throw new Error(mode+" unexpected horizontal overflow "+JSON.stringify(render));
  await page.screenshot({path:"duelboard-"+mode+".jpg",type:"jpeg",quality:78,fullPage:true});
  const first=page.locator(".hand-card").first();
  const slot=page.locator('[data-drop-player="siniestra"]');
  if(mode==="desktop"){await first.click();await slot.click();}
  else{const a=await first.boundingBox(),b=await slot.boundingBox();await page.touchscreen.tap(a.x+a.width/2,a.y+a.height/2);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
  await assertPlay(page,"siniestra");
  console.log("DUELBOARD_CLICK_OK",mode);

  // A fresh game tests physical card dragging using native pointer events.
  await page.locator(".reset-button").click();
  await page.waitForFunction(()=>window.__daggerlightBoardDebug?.()?.hand.length===3);
  const src=await page.locator(".hand-card").first().boundingBox();
  const dst=await page.locator('[data-drop-player="diestra"]').boundingBox();
  if(!src||!dst)throw new Error(mode+" missing drag zones");
  const start={x:src.x+src.width/2,y:src.y+src.height/2};
  const end={x:dst.x+dst.width/2,y:dst.y+dst.height/2};
  if(mode==="desktop"){
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(start.x,start.y-30,{steps:6});
    await page.mouse.move(end.x,end.y,{steps:18});
    await page.mouse.up();
  }else{
    const cdp=await page.context().newCDPSession(page);
    const touch=(type,x,y)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y,id:1}]});
    await touch("touchStart",start.x,start.y);
    await delay(70);
    for(let i=1;i<=20;i++){
      const f=i/20;
      await touch("touchMove",start.x+(end.x-start.x)*f,start.y+(end.y-start.y)*f);
      await delay(20);
    }
    await touch("touchEnd",end.x,end.y);
    await cdp.detach();
  }
  await assertPlay(page,"diestra");
  console.log("DUELBOARD_DRAG_OK",mode);
  if(errors.some(e=>!/favicon|net::ERR|404/.test(e)))throw new Error(mode+" browser errors: "+errors.join("\n"));
  console.log("DUELBOARD_SMOKE_OK",mode,width+"x"+height);
  await page.close();
 }
}finally{
 await browser.close();
 server.kill("SIGTERM");
 server.stdout.destroy();
 server.stderr.destroy();
}
