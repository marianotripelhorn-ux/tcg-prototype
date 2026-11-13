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
  if(await page.locator(".opponent-hand,.lane-number,.hand-hint").count()!==0)
    throw new Error(mode+" old UI elements still remain");
  const nameLifeOverlap=await page.evaluate(()=>{
    return Array.from(document.querySelectorAll(".champion-piece")).some(champion=>{
      const a=champion.querySelector(".champion-nameplate").getBoundingClientRect();
      const b=champion.querySelector(".champion-life").getBoundingClientRect();
      return a.left<b.right-2&&a.right>b.left+2&&a.top<b.bottom-2&&a.bottom>b.top+2;
    });
  });
  if(nameLifeOverlap)throw new Error(mode+" champion name overlaps life badge");
  await page.waitForFunction(()=>Array.from(document.querySelectorAll(".champion-portrait img")).every(n=>n.complete && n.naturalWidth>0),null,{timeout:12000});
  const art=await page.locator(".hand-card .physical-card").first().evaluate(el=>getComputedStyle(el).backgroundImage);
  if(!art.includes("cards/v4/"))throw new Error(mode+" real Card Studio art not connected "+art);
  const render=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,viewport:[innerWidth,innerHeight]}));
  if(render.w>width+3)throw new Error(mode+" unexpected horizontal overflow "+JSON.stringify(render));
  await page.screenshot({path:"duelboard-"+mode+".jpg",type:"jpeg",quality:78,fullPage:true});
  // Preserve short-lived visual states even if screenshot generation is slow.
  // This runs inside the browser and doesn't alter gameplay or animation timing.
  await page.evaluate(()=>{
    const audit={clash:null,impact:null};
    window.__duelVisualAudit=audit;
    const watch=()=>{
      const stage=document.querySelector(".tabletop")?.getAttribute("data-visual-stage");
      if(stage==="clash"){
        const element=document.querySelector(".power-clash");
        if(element)audit.clash={text:element.textContent||""};
      }
      if(stage==="impact"){
        const life=(kind)=>Number(document.querySelector(".champion-piece."+kind+" .champion-life")?.textContent||"-999");
        const gems=(kind)=>document.querySelectorAll(".champion-piece."+kind+" .life-gem.full").length;
        audit.impact={
          playerLife:life("self"),opponentLife:life("rival"),
          playerGems:gems("self"),opponentGems:gems("rival"),
          beams:document.querySelectorAll(".damage-beam").length,
          targets:Array.from(document.querySelectorAll(".champion-piece.taking-hit"))
            .map(n=>n.classList.contains("self")?"self":"rival")
        };
      }
    };
    new MutationObserver(watch).observe(document.querySelector("#root"),{
      childList:true,subtree:true,attributes:true,characterData:true
    });
  });
  // Tap/click opens full-card inspection; choosing a position is a separate step.
  const first=page.locator(".hand-card").first();
  if(mode==="desktop")await first.click();
  else{
    const a=await first.boundingBox();
    await page.touchscreen.tap(a.x+a.width/2,a.y+a.height/2);
  }
  await page.locator(".card-inspect-dialog").waitFor({state:"visible"});
  const fullCard=await page.locator(".card-inspect-art .physical-card").boundingBox();
  const preview=await first.locator(".physical-card").boundingBox();
  if(!fullCard||!preview||fullCard.width<=preview.width*1.1||
     fullCard.x<0||fullCard.y<0||
     fullCard.x+fullCard.width>width+1||fullCard.y+fullCard.height>height+1)
    throw new Error(mode+" inspected card is cropped or not enlarged "+JSON.stringify({fullCard,preview}));
  await page.screenshot({path:"duelboard-inspect-"+mode+".jpg",type:"jpeg",quality:84,fullPage:true});
  await page.locator(".inspect-play").click();
  await page.locator('[data-drop-player="siniestra"]').click();
  // Visual v0.3 must render both actual card flights before resolving the result.
  await page.waitForFunction(()=>document.querySelectorAll(".flight-card").length===2,
    null,{timeout:1200});
  const flight=await debug(page);
  if(!flight.visualSequence||flight.visualSequence.stage!=="flying")
    throw new Error(mode+" flight presentation not started");
  const p=flight.visualSequence.playerFrom,pt=flight.visualSequence.playerTo;
  const e=flight.visualSequence.opponentFrom,et=flight.visualSequence.opponentTo;
  if(Math.hypot(pt.x-p.x,pt.y-p.y)<40 || Math.hypot(et.x-e.x,et.y-e.y)<30)
    throw new Error(mode+" card travel does not reflect board coordinates "+JSON.stringify(flight.visualSequence));
  const startTransform=await page.locator(".flight-card.player").evaluate(el=>getComputedStyle(el).transform);
  await delay(220);
  const middleTransform=await page.locator(".flight-card.player").evaluate(el=>getComputedStyle(el).transform);
  if(startTransform===middleTransform)throw new Error(mode+" flight isn't visually progressing");
  await page.screenshot({path:"duelboard-flight-"+mode+".jpg",type:"jpeg",quality:81,fullPage:true});
  await assertPlay(page,"siniestra");
  await page.waitForFunction(()=>Boolean(window.__duelVisualAudit?.clash &&
    window.__duelVisualAudit?.impact),null,{timeout:5500});
  const audit=await page.evaluate(()=>window.__duelVisualAudit);
  const life=flight.visualSequence.life;
  const realPowers=[flight.visualSequence.playerPower,flight.visualSequence.opponentPower];
  if(!audit.clash.text.includes("ENFRENTAMIENTO DE PODER") ||
     !realPowers.every(value=>audit.clash.text.includes(String(value))))
    throw new Error(mode+" visual clash doesn't display real powers "+JSON.stringify({audit,realPowers}));
  if(audit.impact.playerLife!==life.playerAfter||
     audit.impact.opponentLife!==life.opponentAfter||
     audit.impact.playerGems!==life.playerAfter||
     audit.impact.opponentGems!==life.opponentAfter)
    throw new Error(mode+" visual HP/gems differ from the game engine "+JSON.stringify({audit,life}));
  const damage=flight.visualSequence.damage;
  const expectedDamage=Math.max(0,life.playerBefore-life.playerAfter)+
    Math.max(0,life.opponentBefore-life.opponentAfter);
  if(damage.reduce((total,item)=>total+item.amount,0)!==expectedDamage ||
    audit.impact.beams!==damage.length ||
    audit.impact.targets.length!==damage.length)
    throw new Error(mode+" Champion impacts don't match actual life lost "+JSON.stringify({audit,damage,life}));
  await page.screenshot({path:"duelboard-impact-"+mode+".jpg",type:"jpeg",quality:84,fullPage:true});
  await page.waitForFunction(()=>!document.querySelector(".flight-layer"),null,{timeout:3500});
  const heldState=await debug(page);
  if(!heldState.held||!heldState.reviewReady||heldState.displayedRound!==initial.round||
     heldState.displayedHand.length!==initial.hand.length-1)
    throw new Error(mode+" board revealed next round/hand before Continue "+JSON.stringify(heldState));
  const continueButton=page.locator("[data-continue-duel]");
  await continueButton.waitFor({state:"visible"});
  await delay(550);
  if(!(await debug(page)).held)throw new Error(mode+" review auto-advanced");
  await page.screenshot({path:"duelboard-review-"+mode+".jpg",type:"jpeg",quality:84,fullPage:true});
  await page.locator('[data-drop-player="siniestra"]').click();
  await page.locator(".card-inspect-dialog").waitFor({state:"visible"});
  await page.locator(".card-inspect-close").click();
  await continueButton.click();
  await page.waitForFunction(()=>!window.__daggerlightBoardDebug?.()?.held,null,{timeout:2000});
  console.log("DUELBOARD_REVIEW_GATE_OK",mode);
  console.log("DUELBOARD_POWER_IMPACT_OK",mode,"damage",expectedDamage);
  console.log("DUELBOARD_FLIGHT_OK",mode);
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
  await page.waitForFunction(()=>!document.querySelector(".flight-layer"),null,{timeout:3500});
  console.log("DUELBOARD_DRAG_OK",mode);

  // Reduced-motion mode must resolve the same real duel without flying overlays.
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.locator(".reset-button").click();
  const reducedCard=page.locator(".hand-card").first();
  if(mode==="desktop")await reducedCard.click();
  else {
    const from=await reducedCard.boundingBox();
    await page.touchscreen.tap(from.x+from.width/2,from.y+from.height/2);
  }
  await page.locator(".card-inspect-dialog").waitFor({state:"visible"});
  await page.locator(".inspect-play").click();
  await page.locator('[data-drop-player="trono"]').click();
  await assertPlay(page,"trono");
  if(await page.locator(".flight-card").count())throw new Error(mode+" reduced-motion path still uses flying cards");
  if(!(await debug(page)).reviewReady)throw new Error(mode+" reduced motion must still show manual Continue");
  console.log("DUELBOARD_REDUCED_MOTION_OK",mode);
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
