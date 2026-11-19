/**
 * Daggerlight: genuine desktop + mobile match, no engine mocking.
 * Verifies the centered ceremony banners and game-state handoffs in the React app.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

const ROOT="http://127.0.0.1:4173/";
const browser=await chromium.launch({headless:true,args:[
  "--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"
]});

async function startGame(page){
  let online=false;
  for(let i=0;i<30;i++){
    try{
      const response=await page.goto(ROOT,{waitUntil:"domcontentloaded",timeout:3500});
      if(response?.ok()){online=true;break;}
    }catch{}
    await page.waitForTimeout(240);
  }
  assert.ok(online,"React preview server is not responding");
  await page.locator(".splash-start").waitFor({state:"attached",timeout:18000});
  await page.locator(".splash-start").evaluate(el=>el.click());
  await page.getByRole("button",{name:"SALTAR TUTORIAL",exact:true}).click();
  await page.locator(".home-action.action-play").waitFor({state:"attached",timeout:15000});
  for(let i=0;i<4;i++){
    if(await page.locator(".dl-champion-card").count())break;
    if(await page.locator(".home-action.action-play").count())
      await page.locator(".home-action.action-play").evaluate(el=>el.click());
    try{
      await page.locator(".dl-champion-card").first().waitFor({state:"attached",timeout:5000});
      break;
    }catch(e){if(i===3)throw new Error("Champion menu missing: "+String(e));}
  }
  await page.locator(".dl-champion-card").first().evaluate(el=>el.click());
  await page.locator(".dl-champion-start").waitFor({state:"attached",timeout:12000});
  const starter=page.locator(".dl-faction-card-back").first();
  assert.ok(await starter.locator(".dl-back-art").evaluate(async image=>{await image.decode();return image.naturalWidth>0;}));
  const logo=await page.request.get(ROOT+"branding/logo-simple.png");
  assert.ok(logo.ok()&&logo.headers()["content-type"]?.startsWith("image/"),"Faction backs require the supplied logo");
  await page.evaluate(()=>{
    const entrance=window.__matchEntrance={phases:[],banners:[],hiddenHand:false};
    const observer=new MutationObserver(()=>{
      const root=document.querySelector("main.app-shell.board-redesign-v1");
      const phase=root?.dataset.boardPhase;
      if(!phase||entrance.phases.at(-1)===phase)return;
      entrance.phases.push(phase);
      if(phase==="match-entry"){
        entrance.banners=Array.from(root.querySelectorAll(".hybrid-champion-panel, .hybrid-phone-champion"),
          node=>node.getAnimations()[0]?.effect?.getTiming());
        entrance.hiddenHand=Array.from(root.querySelectorAll(".hand-card")).every(node=>getComputedStyle(node).visibility==="hidden");
      }
      if(phase==="idle")observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-board-phase"]});
  });
  await page.locator(".dl-champion-start").evaluate(el=>el.click());
  await page.locator('main.app-shell.board-redesign-v1[data-board-phase="idle"]').waitFor({state:"attached",timeout:12000});
  const entrance=await page.evaluate(()=>window.__matchEntrance);
  assert.deepEqual(entrance.phases,["match-entry","deal","idle"],"Champion entrance must hand off to the real opening deal");
  assert.ok(entrance.hiddenHand&&entrance.banners.length===2&&entrance.banners.every(timing=>timing?.duration===420),
    "Both Champion groups should enter before the hand appears");
  assert.notEqual(entrance.banners[0].delay,entrance.banners[1].delay,"Champion entrances should be staggered");
  await page.locator(".hand-zone .hand-card").first().waitFor({state:"visible",timeout:12000});
}

async function instrument(page){
  await page.evaluate(()=>{
    const root=document.querySelector("main.app-shell.board-redesign-v1");
    const arena=root.querySelector(".arena-main");
    const shapeProbe=document.createElement("div");
    shapeProbe.className="board-quiero-banner";
    shapeProbe.style.cssText="position:absolute;visibility:hidden;pointer-events:none";
    root.append(shapeProbe);
    const quieroShape=getComputedStyle(shapeProbe).clipPath;
    shapeProbe.remove();
    window.__motionCapture={
      quieroShape,phases:[],flights:[],ribbons:[],duelValues:{},roundReceipt:null,
      roundBanner:null,swap:null,deal:null,archiveCounts:[]
    };
    let lastPhase=null;
    let currentRoundBanner=null;

    function hemClearance(panel,content){
      if(!content)return null;
      const box=panel.getBoundingClientRect();
      return box.top+box.height*.75-content.getBoundingClientRect().bottom;
    }

    function centeredFrames(node,inspect=()=>{}){
      const sample={frames:0,offset:0};
      const readFrame=()=>{
        if(!node.isConnected)return;
        const box=node.getBoundingClientRect();
        const field=arena.getBoundingClientRect();
        sample.frames++;
        sample.offset=Math.max(sample.offset,Math.abs((box.left+box.right-field.left-field.right)/2));
        const style=getComputedStyle(node);
        if(Number(style.opacity)>=.99&&(style.transform==="none"||new DOMMatrix(style.transform).isIdentity)){
          sample.lift=(field.top+field.bottom-box.top-box.bottom)/2;
        }
        inspect();
        requestAnimationFrame(readFrame);
      };
      requestAnimationFrame(readFrame);
      return sample;
    }

    function read(){
      const m=window.__motionCapture;
      const rivalContinue=root.querySelector(".board-quiero-banner .board-quiero-rival-continue");
      if(rivalContinue)m.rivalClearance=hemClearance(rivalContinue.closest(".board-quiero-banner"),rivalContinue);
      const phase=root?.dataset.boardPhase;
      if(phase&&phase!==lastPhase){
        lastPhase=phase;
        m.phases.push(phase);
        if(phase==="round-wipe-reveal"){
          const stage=root.querySelector(".dl-new-round-stage");
          const ink=stage?.querySelector(".dl-new-round-ink");
          const hand=Array.from(root.querySelectorAll(".hand-zone .hand-card"));
          const cover=stage?.getBoundingClientRect();
          const field=arena.getBoundingClientRect();
          const stageStyle=stage&&getComputedStyle(stage);
          const bannerStyle=ink&&getComputedStyle(ink);
          m.swap={
            time:performance.now(),
            sameBanner:ink===currentRoundBanner,
            bannerOpaque:Number(bannerStyle?.opacity)>=.99,
            backdropOpaque:Number(stageStyle?.opacity)>=.99&&stageStyle?.backgroundColor==="rgb(23, 22, 19)",
            coversBoard:!!cover&&Math.abs(cover.left-field.left)<2&&Math.abs(cover.right-field.right)<2
              &&Math.abs(cover.top-field.top)<2,
            coversHand:!!cover&&hand.length>0&&hand.every(card=>card.getBoundingClientRect().bottom<=cover.bottom+2),
            handCount:hand.length,
            newRound:Number(root.querySelector(".arena-top-center span b")?.textContent),
            boardCardCount:root.querySelectorAll(".board-slot .played-card").length
          };
        }
      }

      if(phase==="archive"||phase==="round-wipe"){
        const values=Array.from(root.querySelectorAll(".board-slot .archive-count"),node=>node.getAttribute("aria-label"));
        if(JSON.stringify(values)!==JSON.stringify(m.archiveCounts.at(-1)))m.archiveCounts.push(values);
      }
      if(phase==="deal"&&!m.deal){
        const cards=Array.from(root.querySelectorAll(".hand-zone .hand-card > .game-card"));
        m.deal=cards.map(card=>{
          const effect=card.getAnimations().find(a=>a.effect?.getTiming().duration===240)?.effect;
          return {duration:effect?.getTiming().duration,delay:effect?.getTiming().delay,
            upright:effect?.getKeyframes().every(frame=>!frame.transform?.includes("rotate"))??false};
        });
      }
      const beat=root.querySelector(".duel-choreo")?.dataset.duelBeat;
      if(["approach","result","settle"].includes(beat)&&!m.duelValues[beat]){
        const score=root.querySelector(".hybrid-duel-tally, .hybrid-phone-score");
        const digits=score?.getAttribute("aria-label")?.match(/\d+/g)??[];
        m.duelValues[beat]={
          score:digits.map(Number),
          life:["player","opponent"].map(side=>
            Number(root.querySelector(".hybrid-life-unit."+side+" .hybrid-life-number")?.textContent)
          ),
          pulse:score?.querySelector("strong")?.getAnimations().some(a=>a.animationName==="dl-duel-score-receive"),
          payout:root.dataset.duelPayout
        };
      }

      const flight=document.querySelector(".board-motion-flight");
      if(flight&&m.flights.length<4&&!flight.dataset.smokeCaptured){
        flight.dataset.smokeCaptured="true";
        const shadow=flight.querySelector(".dl-flight-shadow");
        const fa=flight.getAnimations()[0];
        const sa=shadow?.getAnimations()[0];
        m.flights.push({
          left:parseFloat(flight.style.left),top:parseFloat(flight.style.top),
          duration:fa?.effect?.getTiming().duration??0,
          keyframes:fa?.effect?.getKeyframes()?.map(f=>f.transform)??[],
          shadowDuration:sa?.effect?.getTiming().duration??0,
          shadowKeyframes:sa?.effect?.getKeyframes()?.map(f=>f.transform)??[],
          hasShadow:!!shadow,ringCount:flight.querySelectorAll(".board-gs-flight-ring").length
        });
      }

      const ribbon=root.querySelector(".dl-duel-stinger");
      if(ribbon&&m.ribbons.length<4&&!ribbon.dataset.smokeCaptured){
        ribbon.dataset.smokeCaptured="true";
        const style=getComputedStyle(ribbon);
        const animation=ribbon.getAnimations().find(item=>item.animationName==="dl-duel-banner");
        const frames=animation?.effect?.getKeyframes()??[];
        m.ribbons.push({
          rest:frames.map(frame=>({offset:frame.computedOffset,transform:frame.transform,opacity:frame.opacity})),
          duration:animation?.effect?.getTiming().duration,
          motion:style.animationName,
          shape:style.clipPath,
          clearance:hemClearance(ribbon,ribbon.querySelector(".dl-duel-stinger-contents")),
          art:ribbon.querySelector(".dl-ceremony-art")?.src,
          playerPower:ribbon.dataset.playerPower,
          opponentPower:ribbon.dataset.opponentPower,
          outcome:ribbon.dataset.outcome,
          resultIsChild:!!ribbon.querySelector(".dl-duel-stinger-result"),
          center:centeredFrames(ribbon)
        });
      }

      const receipt=root.querySelector(".board-round-receipt-stage .board-round-ceremony");
      if(receipt&&!m.roundReceipt){
        const effect=receipt.getAnimations().find(a=>a.animationName==="dl-round-receipt-reveal")?.effect;
        const frames=effect?.getKeyframes()??[];
        const settled=frames.filter(frame=>frame.opacity==="1"&&frame.transform===frames[2]?.transform);
        m.roundReceipt={
          hold:effect&&settled.length===2?(settled[1].computedOffset-settled[0].computedOffset)*effect.getTiming().duration:0,
          shape:getComputedStyle(receipt).clipPath,
          clearance:hemClearance(receipt,receipt.querySelector(".board-round-reason")??receipt.querySelector(".board-round-outcome")),
          art:receipt.querySelector(".dl-ceremony-art")?.src,
          title:receipt.querySelector(".board-round-kicker")?.textContent?.trim(),
          score:receipt.querySelector(".board-round-score")?.textContent?.trim(),
          outcome:receipt.querySelector(".board-round-outcome")?.textContent?.trim(),
          center:centeredFrames(receipt)
        };
      }

      const stage=root.querySelector(".dl-new-round-stage");
      const ink=stage?.querySelector(".dl-new-round-ink");
      if(ink&&!m.roundBanner){
        currentRoundBanner=ink;
        const title=ink.querySelector(".dl-new-round-number");
        const cover=ink.getAnimations().find(item=>item.effect?.getTiming().duration===250);
        const banner=m.roundBanner={
          entryMs:cover?.effect?.getTiming().duration,
          entryTransforms:cover?.effect?.getKeyframes().map(frame=>frame.transform)??[],
          oldRound:Number(root.querySelector(".arena-top-center span b")?.textContent),
          oldBoardCount:root.querySelectorAll(".board-slot .played-card").length,
          shape:getComputedStyle(ink).clipPath,
          clearance:hemClearance(ink,ink.querySelector(".dl-ceremony-rule")),
          art:ink.querySelector(".dl-ceremony-art")?.src,
          text:title?.textContent?.trim(),
          font:title?getComputedStyle(title).fontFamily:""
        };
        banner.center=centeredFrames(ink,()=>{
          if(banner.exitMs)return;
          const exit=ink.getAnimations().find(item=>item.effect?.getTiming().duration===240);
          if(!exit)return;
          banner.exitMs=exit.effect.getTiming().duration;
          banner.exitTransforms=exit.effect.getKeyframes().map(frame=>frame.transform);
          banner.exitStart=performance.now();
        });
      }
    }
    read();
    const watch=new MutationObserver(read);
    watch.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["data-board-phase","data-duel-beat"]});
  });
}

async function chooseHandCard(page){
  const first=page.locator(".hand-zone .hand-card").first();
  await first.waitFor({state:"visible",timeout:10000});
  await first.click();
  if(await page.locator(".hybrid-phone-champion").count()){
    const modal=page.locator(".is-phone-hand-inspection");
    await modal.waitFor({state:"visible"});
    assert.equal(await modal.locator(".zoom-actions .primary-button").count(),0);
    assert.ok(await modal.locator(".zoom-card-frame").evaluate(el=>el.getBoundingClientRect().width>=innerWidth*.6),
      "Mobile inspection must enlarge the full card");
    await modal.getByRole("button",{name:"Cerrar carta"}).click();
    assert.equal(await first.getAttribute("aria-pressed"),"true");
  }else{
    await page.locator(".card-zoom-overlay .zoom-actions .primary-button").evaluate(el=>el.click());
  }
  return first;
}

async function playCard(page){
  await page.locator('main[data-board-phase="idle"]').waitFor({state:"attached",timeout:14000});
  const first=await chooseHandCard(page);
  const lane=page.locator(".board-slot.player.drop-active").first();
  await lane.waitFor({state:"attached",timeout:8000});
  // The first interaction changes the selected card's transform. Measure the
  // true selected-hand origin immediately before committing this real play,
  // exactly when CardFlight snapshots its starting geometry.
  const origin=await first.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.left,y:r.top,width:r.width,height:r.height};});
  await lane.evaluate(el=>el.click());
  return origin;
}

async function settleDuel(page){
  const duel=page.locator(".duel-showcase-overlay");
  await duel.waitFor({state:"attached",timeout:15000});
  // The result is a real resolved play. Speed through earlier unchanged Power
  // reveals only on subsequent turns, while the first one runs at real speed.
  if(await duel.count() && await duel.getAttribute("data-duel-beat")==="approach"){
    await duel.locator(".duel-showcase-skip").evaluate(el=>el.click());
  }
  await page.waitForFunction(()=>window.__motionCapture?.ribbons.length>0,
    undefined,{timeout:14000});
  await duel.waitFor({state:"detached",timeout:12000});
}

async function closeQuiero(page){
  return page.evaluate(()=>{
    const choice=document.querySelector(".board-quiero-stage .board-quiero-no, .hybrid-phone-quiero .secondary-button");
    if(!choice||choice.disabled)return false;
    if(choice.closest(".board-quiero-stage")&&!choice.closest(".board-quiero-banner")){
      throw Error("Existing faction decision banner was lost");
    }
    const banner=choice.closest(".board-quiero-banner");
    if(banner){
      const panel=banner.getBoundingClientRect();
      const button=choice.getBoundingClientRect();
      if(panel.top+panel.height*.75-button.bottom<18)throw Error("The Quiero controls overlap the swallowtail");
    }
    choice.click();
    return true;
  });
}

async function runMatch(label,viewport,isMobile){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile,hasTouch:isMobile});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
    await startGame(page);
    await instrument(page);
    assert.ok(await page.locator(".arena-main").count(),"Original ivory board must remain mounted");
    assert.ok(await page.locator(".board-slot.player").count()>=3,"All three original lanes must be present");
    const origin=await playCard(page);
    const duel=page.locator(".duel-showcase-overlay");
    await duel.waitFor({state:"attached",timeout:15000});
    await page.waitForFunction(()=>window.__motionCapture.flights.length>0,undefined,{timeout:7000});
    // Inspect the natural result and verify the single grouped graphic.
    await page.waitForFunction(()=>window.__motionCapture.ribbons.length>0,undefined,{timeout:12000});
    await duel.waitFor({state:"detached",timeout:9000});
    let data=await page.evaluate(()=>window.__motionCapture);
    const flight=data.flights[0];
    assert.ok(flight?.hasShadow,label+": the real card requires a shadow child");
    assert.equal(flight.duration,270,label+": card hand-to-slot animation must be 270ms");
    assert.equal(flight.shadowDuration,270,label+": shadow must follow the same 270ms clock");
    assert.ok(Math.abs(flight.left-origin.x)<10 && Math.abs(flight.top-origin.y)<10,
      label+": card must originate from its selected hand position: "+JSON.stringify({origin,flight}));
    assert.ok(flight.shadowKeyframes.some(k=>String(k).includes("30px")),
      label+": down-right shadow must stretch during the lift");
    assert.equal(flight.ringCount,0,label+": do not emit decorative rings or particles");
    const ribbon=data.ribbons[0];
    assert.ok(data.quieroShape.includes("100% 100%")&&data.quieroShape.includes("50% 75%"),label+": Quiero must have a two-point swallowtail hem");
    assert.ok(ribbon&&ribbon.duration===1200&&ribbon.motion.includes("dl-duel-banner"),
      label+": 1200ms centered duel banner animation missing");
    assert.equal(ribbon.shape,data.quieroShape,label+": duel banner must use the real Quiero silhouette");
    assert.ok(ribbon.center.frames>=1&&ribbon.center.offset<4,
      label+": duel banner must stay centered while it is moving and holding: "+JSON.stringify(ribbon.center));
    assert.ok(ribbon.rest.some((frame,i)=>{
      const next=ribbon.rest[i+1];
      return next&&frame.transform===next.transform&&Number(frame.opacity??1)>=.95
        &&Number(next.opacity??1)>=.95&&next.offset-frame.offset>=.35;
    }),label+": grouped result needs a stable reading beat after settling");
    assert.ok(ribbon.resultIsChild && ribbon.playerPower!==undefined && ribbon.opponentPower!==undefined,
      label+": both final Poder values and actual outcome must move together");
    assert.ok(["player","opponent","draw"].includes(ribbon.outcome),
      label+": result must be the real engine outcome");
    const {approach,result,settle}=data.duelValues;
    assert.ok(approach&&result&&settle,label+": observe the complete duel handoff");
    assert.deepEqual(result.life,approach.life,label+": Life must hold through the ribbon");
    assert.deepEqual(result.score,approach.score,label+": score must hold through the ribbon");
    const win=ribbon.outcome!=="draw";
    assert.equal(settle.payout,ribbon.outcome,label+": board payout is driven by the actual result");
    assert.equal(settle.pulse,win,label+": only a decisive result pulses the score");
    assert.deepEqual(settle.score,approach.score.map((value,i)=>
      value+(ribbon.outcome===(i===0?"player":"opponent")?1:0)
    ),label+": exactly the actual winner receives a point");
    assert.equal(await page.locator(".duel-showcase-outcome").count(),0,
      label+": no separate floating old outcome title");

    // Play the genuine next decisions until the first real round closes.
    for(let attempt=0;attempt<4;attempt++){
      data=await page.evaluate(()=>window.__motionCapture);
      if(data.phases.includes("round"))break;
      await page.locator('main[data-board-phase="idle"]').waitFor({state:"attached",timeout:14500});
      if(await closeQuiero(page)){
        await page.waitForTimeout(400);
        continue;
      }
      await playCard(page);
      await settleDuel(page);
    }
    await page.waitForFunction(()=>window.__motionCapture.phases.includes("round-wipe-reveal"),
      undefined,{timeout:18000});
    await page.waitForFunction(()=>window.__motionCapture.phases.includes("idle") &&
      window.__motionCapture.phases.indexOf("round-wipe-reveal") <
      window.__motionCapture.phases.lastIndexOf("idle"),undefined,{timeout:10000});
    data=await page.evaluate(()=>window.__motionCapture);
    for(const phase of ["flight","duel","round","archive","round-wipe","round-wipe-reveal","deal","idle"])
      assert.ok(data.phases.includes(phase),label+": missing real match phase "+phase);
    const {roundReceipt,roundBanner,swap}=data;
    const expectedLift=viewport.width<=760&&viewport.height>viewport.width
      ? Math.min(88,Math.max(24,viewport.height*.1)) : 0;
    for(const item of [ribbon,roundReceipt,roundBanner]){
      assert.ok(Math.abs(item?.center.lift-expectedLift)<4,
        label+": result banner needs the correct resting height: "+JSON.stringify(item?.center));
    }
    if(data.rivalClearance!==undefined)assert.ok(data.rivalClearance>=18,label+": rival Continue needs room above the hem");
    for(const banner of [ribbon,roundReceipt,roundBanner]){
      assert.ok(banner?.clearance>=18,label+": each result banner needs room above the hem: "+JSON.stringify(banner?.clearance));
      assert.ok(banner?.art?.includes("/champions/backgrounds/"),label+": banner needs its faction art layer");
      const art=await page.request.get(banner.art);
      assert.ok(art.ok()&&art.headers()["content-type"]?.startsWith("image/"),
        label+": the faction artwork URL must serve an image: "+banner.art);
    }
    console.log("MOTION DIAGNOSTIC "+label+" "+JSON.stringify({roundReceipt,roundBanner,swap}));
    assert.ok(roundReceipt?.title?.includes("FINALIZADA")&&roundReceipt.score&&roundReceipt.outcome,
      label+": round receipt must group the actual completed-round result");
    assert.equal(roundReceipt.shape,data.quieroShape,label+": round receipt must use the Quiero silhouette");
    assert.ok(roundReceipt.hold>=990,label+": the round recap needs about a second at rest");
    assert.ok(roundReceipt.center.frames>=1&&roundReceipt.center.offset<4,
      label+": round receipt must remain centered");
    assert.ok(roundBanner&&roundBanner.entryMs===250&&roundBanner.exitMs===240,
      label+": new-round banner must use the 250ms entrance and 240ms exit");
    assert.equal(roundBanner.shape,data.quieroShape,label+": new-round banner must use the Quiero silhouette");
    assert.ok(roundBanner.center.frames>=1&&roundBanner.center.offset<4,
      label+": new-round banner must stay centered throughout the motion");
    assert.ok(new Set(roundBanner.entryTransforms).size>=2&&new Set(roundBanner.exitTransforms).size>=2,
      label+": new-round banner entrance and exit must move");
    assert.ok(swap&&roundBanner.exitStart-swap.time>=800,
      label+": the next round number needs a readable hold at full cover");
    assert.ok(roundBanner.font.includes("Archivo Black")&&roundBanner.text==="RONDA "+swap.newRound,
      label+": the banner must show the engine's new round number in Archivo Black");
    assert.ok(swap.sameBanner&&swap.bannerOpaque&&swap.backdropOpaque&&swap.coversBoard&&swap.coversHand,
      label+": the separate opaque backdrop must cover the board and hand at the swap: "+JSON.stringify(swap));
    assert.ok(roundBanner.oldBoardCount>0&&swap.newRound===roundBanner.oldRound+1
      &&swap.handCount>=1&&swap.boardCardCount===0,
      label+": preserve the old board until the covered swap to real new lanes and hand");
    assert.ok(data.archiveCounts.length>1,label+": Archive counters should tick during actual card arrivals: "+JSON.stringify(data.archiveCounts));
    assert.ok(data.deal?.length>=1&&data.deal.every((card,i)=>
      card.upright&&card.duration>=200&&card.duration<=320&&(i===0||card.delay>data.deal[i-1].delay)
    ),label+": the engine hand needs upright, staggered card flights: "+JSON.stringify(data.deal));
    assert.ok(await page.locator(".hand-zone .hand-card").count()>=1,
      label+": playable real new hand must be revealed");
    assert.ok(errors.length===0,label+": JavaScript runtime errors: "+errors.join(" | "));

    console.log("PASS "+label+": real card flight, centered Quiero-style result banners, covered round swap and real deal");
  }finally{await page.close();}
}

async function runStudy(label,viewport,reducedMotion){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion});
  const failures=[];
  page.on("pageerror",error=>failures.push(error.message));
  try{
    await page.goto(ROOT+"?lab=motion-study",{waitUntil:"domcontentloaded"});
    const stage=page.locator(".ms-stage");
    const next=async id=>stage.and(page.locator('[data-scene="'+id+'"]')).waitFor({state:"visible"});
    await next("entry");
    assert.equal(await page.locator(".ms-chapters button").count(),11);
    if(reducedMotion==="no-preference"){
      await stage.evaluate(field=>{
        const states=window.__motionStudyStates={scenes:[],power:false,life:false,cardFrames:0,tilted:false};
        const read=()=>{
          const scene=field.dataset.scene;
          if(!states.scenes.includes(scene))states.scenes.push(scene);
          if(scene==="power"&&field.querySelector('[data-card="rival"] .live-power-badge b')?.textContent==="8")states.power=true;
          if(scene==="life"&&field.querySelector(".ms-score strong")?.textContent==="0–2" &&
            field.querySelector("[data-life=player] b")?.textContent==="7")states.life=true;
        };
        new MutationObserver(read).observe(field,{attributes:true,childList:true,subtree:true,characterData:true,attributeFilter:["data-scene"]});
        read();
        const checkCards=()=>{
          for(const card of field.querySelectorAll(".ms-flying-card")){
            const style=getComputedStyle(card);
            if(Number(style.opacity)<.08)continue;
            const matrix=new DOMMatrix(style.transform==="none"?"":style.transform);
            if([matrix.m12,matrix.m13,matrix.m21,matrix.m23,matrix.m31,matrix.m32].some(v=>Math.abs(v)>.001)){
              states.tilted=true;
            }
            states.cardFrames++;
          }
          if(states.scenes.length<11)requestAnimationFrame(checkCards);
        };
        requestAnimationFrame(checkCards);
      });
      await page.getByRole("button",{name:"Reproducir todo",exact:true}).click();
      await next("finish");
      await page.getByRole("button",{name:"Reproducir todo",exact:true}).waitFor({state:"visible"});
      const states=await page.evaluate(()=>window.__motionStudyStates);
      assert.equal(states.scenes.length,11,"Playback must show all match scenes");
      assert.ok(states.power&&states.life,"Power and Life must update during playback");
      assert.ok(states.cardFrames>20&&!states.tilted,"Cards must remain front-facing throughout the sequence");
      assert.equal(await stage.locator(".ms-ripple i").count(),2);
      assert.equal(await stage.locator(".ms-wave, .ms-card-back").count(),0);
      await page.getByRole("button",{name:"Poder",exact:true}).click();
      await stage.and(page.locator('[data-scene="power"][data-playback="still"]')).waitFor({state:"visible"});
      await page.screenshot({path:"/tmp/daggerlight-round-shadow-sweep-v3-motion-study-"+label+".png"});
    }else{
      await page.getByRole("button",{name:"Reproducir todo",exact:true}).click();
      await page.getByRole("button",{name:"Detener",exact:true}).click();
      await page.getByRole("button",{name:"Poder",exact:true}).click();
      await next("power");
      const poses=await stage.locator(".ms-flying-card").evaluateAll(cards=>cards.map(card=>getComputedStyle(card).opacity));
      assert.ok(poses.every(opacity=>opacity==="1"),"Reduced motion should show finished poses immediately");
      await page.screenshot({path:"/tmp/daggerlight-round-shadow-sweep-v3-motion-study-"+label+".png"});
    }
    const powerLayout=await stage.locator('[data-card="rival"]').evaluate(card=>{
      const center=node=>{
        const box=node.getBoundingClientRect();
        return {x:box.left+box.width/2,y:box.top+box.height/2};
      };
      const number=center(card.querySelector(".ms-delta"));
      const ring=center(card.querySelector(".ms-power-gain i"));
      const rect=card.getBoundingClientRect();
      return {
        centered:Math.hypot(number.x-ring.x,number.y-ring.y)<1,
        upperLeft:number.y<rect.top&&Math.abs((number.x-rect.left)/rect.width-.14)<.015
      };
    });
    assert.ok(powerLayout.centered&&powerLayout.upperLeft,label+": the Power increase and ripple must share the card's upper-left anchor");
    await page.getByRole("button",{name:"Quiero / No quiero",exact:true}).click();
    await next("decision");
    const bannerShape=await stage.locator(".ms-decision").evaluate(node=>getComputedStyle(node).clipPath);
    assert.equal(bannerShape,await stage.locator(".ms-portrait").first().evaluate(node=>getComputedStyle(node).clipPath));
    assert.ok(bannerShape.includes("100% 100%")&&bannerShape.includes("50% 75%"),"The decision and Champion banners should share the two-point hem");
    await page.getByRole("button",{name:"Quiero",exact:true}).click();
    assert.ok(await page.getByText("Continúa el duelo",{exact:true}).isVisible());
    await page.getByRole("button",{name:"No quiero",exact:true}).click();
    await next("archive");
    await page.waitForFunction(()=>document.querySelector(".ms-archive strong")?.textContent==="1");
    const hasPageOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.ok(!hasPageOverflow,label+": study must fit the viewport");
    assert.deepEqual(failures,[],label+": study has runtime errors");
    console.log("PASS "+label+": new full-match animation study, playback and decision");
  }finally{await page.close();}
}

async function assertGuidedDuelLayout(page,beat){
  const overlay=page.locator(".duel-beat-"+beat+".is-guided-duel");
  const action=overlay.locator(".duel-showcase-skip");
  await action.scrollIntoViewIfNeeded();
  const layout=await overlay.evaluate((root,beat)=>{
    const selectors=beat==="compare"
      ? [".duel-showcase-side",".duel-showcase-face",".dl-live-power-cue span",".duel-effect-note",
          ".duel-effect-column-kicker",".duel-effect-remaining",".duel-choreo-comparison",".dl-guide-duel-note"]
      : [".dl-ceremony-kicker",".dl-duel-stinger-result",".dl-duel-stinger-contents",".dl-guide-banner-note"];
    selectors.push(".duel-showcase-skip",".dl-guide-duel-exit");
    const boxes=selectors.flatMap(selector=>[...root.querySelectorAll(selector)].map((node,index)=>({
      name:selector+"#"+index,rect:node.getBoundingClientRect()
    }))).filter(({rect})=>rect.width>0&&rect.height>0);
    const overlaps=boxes.flatMap((a,index)=>boxes.slice(index+1).filter(b=>
      Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>2&&
      Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>2
    ).map(b=>[a.name,b.name]));
    const button=root.querySelector(".duel-showcase-skip");
    const rect=button.getBoundingClientRect();
    const target=document.elementFromPoint(rect.left+rect.width/2,rect.bottom-3);
    const powers=[...root.querySelectorAll("[data-power-state=final] .duel-showcase-power strong")].map(node=>node.textContent);
    return {
      overlaps,powers,hit:button.contains(target),
      guideRail:document.querySelector(".dl-opening-guide")!==null,
      hoverPreview:document.querySelector(".arena-card-hover-preview,.arena-card-board-preview")!==null
    };
  },beat);
  const description=JSON.stringify({beat,viewport:page.viewportSize(),...layout});
  assert.deepEqual(layout.overlaps,[],description);
  assert.ok(layout.hit,description);
  assert.equal(layout.guideRail,false,description);
  assert.equal(layout.hoverPreview,false,description);
  if(beat==="compare")assert.ok(layout.powers.length===2&&layout.powers.every(value=>/^-?\d+$/.test(value)),description);
}

async function runWelcome(){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  try{
    await page.goto(ROOT,{waitUntil:"domcontentloaded"});
    await page.locator(".splash-start").evaluate(el=>el.click());
    await page.getByRole("img",{name:"INVOCADAGAS",exact:true}).waitFor({state:"visible"});
    await page.getByLabel("Tu nombre de jugador").fill("Mariano Test");
    await page.getByRole("button",{name:"EMPEZAR PARTIDA GUIADA",exact:true}).click();
    await page.locator(".dl-opening-guide").waitFor({state:"visible"});
    assert.equal(await page.locator(".dl-champion-card").count(),0,"Guided play skips setup");
    const idle=page.locator('main[data-board-phase="idle"]');
    const recap=page.locator(".board-round-receipt-stage.is-guide-receipt");
    for(let turn=0;turn<3;turn++){
      await page.locator('main:is([data-board-phase="idle"],[data-board-phase="round"])').waitFor({state:"attached"});
      if(await recap.count())break;
      if(await closeQuiero(page))break;
      await idle.waitFor({state:"attached"});
      const first=page.locator(".hand-zone .hand-card").first();
      await first.click();
      const inspection=page.locator(".is-guided-hand-inspection");
      await inspection.waitFor({state:"visible"});
      assert.equal(await first.getAttribute("aria-pressed"),"false","Opening the card is its own step");
      assert.equal(await page.locator(".board-slot.player.drop-active").count(),0);
      await inspection.getByRole("button",{name:"CONTINUAR →",exact:true}).click();
      assert.equal(await first.getAttribute("aria-pressed"),"true");
      await page.locator(".board-slot.player.drop-active").first().evaluate(el=>el.click());
      const resultButton=page.getByRole("button",{name:"VER RESULTADO →",exact:true});
      await page.locator(".duel-beat-compare").waitFor({state:"visible"});
      if(turn===0){
        await page.waitForTimeout(1100);
        assert.ok(await resultButton.isEnabled(),"The guide must wait at final Power");
        assert.equal(await page.locator(".dl-duel-stinger").count(),0);
      }
      await assertGuidedDuelLayout(page,"compare");
      if(turn===0){
        for(const viewport of [{width:1600,height:900},{width:1067,height:539},{width:680,height:375}]){
          await page.setViewportSize(viewport);
          await assertGuidedDuelLayout(page,"compare");
        }
        await page.setViewportSize({width:390,height:844});
      }
      await resultButton.click();
      const result=page.locator(".dl-duel-stinger.dl-guide-held");
      await result.waitFor({state:"visible"});
      if(turn===0){
        await page.waitForTimeout(1400);
        assert.ok(await result.isVisible(),"The guided outcome must stay until Continue");
        for(const viewport of [{width:1067,height:539},{width:680,height:375},{width:390,height:844}]){
          await page.setViewportSize(viewport);
          await assertGuidedDuelLayout(page,"result");
        }
      }
      await page.locator(".duel-beat-result .duel-showcase-skip").click();
    }
    await recap.waitFor({state:"visible"});
    await page.waitForTimeout(1750);
    assert.ok(await recap.isVisible(),"The round guide must wait before archiving");
    await recap.getByRole("button",{name:"CONTINUAR A ARCHIVOS →",exact:true}).click();
    await idle.waitFor({state:"attached"});
    assert.equal(await page.locator(".dl-opening-guide").count(),0,"Round two returns to normal play");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".splash-start").evaluate(el=>el.click());
    await page.locator(".home-action.action-continue").waitFor({state:"visible"});
    assert.equal(await page.locator(".dl-welcome").count(),0);
    assert.ok(await page.evaluate(()=>Object.values(localStorage).includes("Mariano Test")),"Player name should persist");
    console.log("PASS first visit: name, Invocadagas, paced inspect, Power, result and Archive steps");
  }finally{await page.close();}
}

async function terminalFixture(){
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:"custom"});
  try{
    const engine=await server.ssrLoadModule("/src/engine/game.ts");
    const {legalPositions}=await server.ssrLoadModule("/src/engine/rules.ts");
    const {SAVE_KEY,newSavedMatch}=await server.ssrLoadModule("/src/persistence.ts");
    for(let seed=1;seed<=48;seed++){
      let random=seed;
      const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
      const game=engine.startGame("dextral","sinistral",rng,"opponent","hard",undefined,false);
      for(let turn=0;turn<48&&game.phase!=="finished";turn++){
        if(game.phase==="awaiting_quiero"){engine.answerQuiero(game,true,rng);continue;}
        const position=legalPositions(game.player)[0];
        if(game.phase!=="awaiting_player"||!game.player.hand.length||!position)break;
        const before=game.pendingOpponentPlay?engine.cloneGame(game):null;
        engine.submitPlayerPlay(game,0,position,rng);
        if(before&&game.phase==="finished"&&["player","opponent"].includes(game.winner)){
          return {key:SAVE_KEY,save:newSavedMatch(before,"sinistral","Playtest QA"),position,winner:game.winner,
            champion:game[game.winner].champion.id,life:[game.player.life,game.opponent.life]};
        }
      }
    }
    throw Error("No real pre-finale match found");
  }finally{await server.close();}
}

async function runFinale(){
  const fixture=await terminalFixture();
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
    await page.goto(ROOT,{waitUntil:"domcontentloaded"});
    await page.locator(".splash-start").evaluate(el=>el.click());
    await page.getByRole("button",{name:/CONTINUAR PARTIDA/}).click();
    await chooseHandCard(page);
    await page.locator('.board-slot.player.drop-active[data-position="'+fixture.position+'"]').evaluate(el=>el.click());
    const banner=page.locator(".dl-match-finale");
    await banner.waitFor({state:"visible",timeout:30000});
    assert.equal(await banner.getAttribute("data-outcome"),fixture.winner);
    assert.equal(await banner.getAttribute("data-champion"),fixture.champion);
    assert.equal(await banner.locator("img:not(.dl-ceremony-art)").count(),0);
    assert.ok(await banner.locator(".dl-finale-champion").textContent());
    const materials=await banner.evaluate(async el=>{
      const art=el.querySelector(".dl-ceremony-art");
      await art.decode();
      const rect=art.getBoundingClientRect();
      return {
        art:art.naturalWidth>0&&rect.width>100&&rect.height>100&&art.src.includes("/champions/backgrounds/"),
        cloth:getComputedStyle(el,"::after").backgroundImage.includes("banner-gold.webp"),
        filter:getComputedStyle(art.parentElement).filter
      };
    });
    assert.ok(materials.art&&materials.cloth,"Faction artwork and cloth must be separate visible layers");
    assert.equal(materials.filter,fixture.winner==="opponent"?"grayscale(0.84)":"none",
      "Desaturate the fabric only on defeat");
    assert.deepEqual(await banner.locator(".dl-finale-life strong").allTextContents(),fixture.life.map(String));
    assert.ok(await banner.evaluate(el=>getComputedStyle(el).clipPath.includes("50% 75%")));
    const continueButton=banner.getByRole("button",{name:/CONTINUAR/});
    assert.ok(await continueButton.evaluate(el=>document.activeElement===el));
    await banner.evaluate(el=>Promise.allSettled(el.getAnimations().map(animation=>animation.finished)));
    for(const viewport of [{width:390,height:844},{width:1067,height:539},{width:844,height:390}]){
      await page.setViewportSize(viewport);
      await continueButton.scrollIntoViewIfNeeded();
      const layout=await continueButton.evaluate(el=>{
        const control=el.getBoundingClientRect();
        const panel=el.closest(".dl-match-finale").getBoundingClientRect();
        // The shared pennant's central cut starts 75% down the banner.
        return {width:panel.width,height:panel.height,clearance:panel.top+panel.height*.75-control.bottom,
          clickable:el.contains(document.elementFromPoint(control.left+control.width/2,control.bottom-3))};
      });
      assert.ok(layout.height>layout.width&&layout.clearance>=18&&layout.clickable,
        "The tall finale must leave the button above the hem: "+JSON.stringify({viewport,layout}));
      if(viewport.width===1067)await page.screenshot({path:"/tmp/daggerlight-round-shadow-sweep-v3-finale.png"});
    }
    const sent=[];
    await page.route("https://us.i.posthog.com/capture/",async route=>{
      const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
      if(route.request().method()==="OPTIONS")return route.fulfill({status:204,headers});
      sent.push(route.request().postDataJSON());
      await route.fulfill({status:sent.length===1?503:200,headers,json:{status:sent.length===1?0:1}});
    });
    await continueButton.click();
    const feedback=page.locator(".dl-match-feedback");
    await feedback.getByRole("heading",{name:"¿Te divertiste en esta partida, Playtest QA?"}).waitFor({state:"visible"});
    const options=page.getByRole("group",{name:"Opciones después de la partida"});
    assert.equal(await options.count(),0);
    assert.equal(await feedback.locator('input[type="radio"]:checked').count(),0);
    assert.ok(await feedback.getByRole("button",{name:"Omitir",exact:true}).isEnabled());
    await feedback.getByRole("radio",{name:"No",exact:true}).check();
    await feedback.getByLabel("Comentario (opcional)").fill("Probé el duelo final.");
    await feedback.getByRole("button",{name:"Responder un cuestionario"}).click();
    await feedback.getByLabel("¿Qué te gustó más?").fill("Las decisiones de posición.");
    await feedback.getByLabel("¿En qué momento te costó entender qué hacer?").fill("En el primer duelo.");
    await feedback.getByRole("button",{name:/Volver/}).click();
    assert.equal(await feedback.getByLabel("Comentario (opcional)").inputValue(),"Probé el duelo final.");
    await feedback.getByRole("button",{name:"Responder un cuestionario"}).click();
    assert.equal(await feedback.getByLabel("¿Qué te gustó más?").inputValue(),"Las decisiones de posición.");
    assert.equal(sent.length,0,"Opening or editing a questionnaire must not send anything");
    const send=feedback.getByRole("button",{name:"Enviar respuestas"});
    await send.click();
    await feedback.getByRole("alert").waitFor({state:"visible"});
    await send.click();
    await feedback.getByText("Gracias. Tus respuestas se enviaron.").waitFor({state:"visible"});
    assert.equal(sent.length,2);
    assert.equal(sent[1].event,"daggerlight_match_feedback");
    const payload=sent[1].properties;
    assert.deepEqual({
      name:payload.player_name,champion:payload.champion_id,rival:payload.rival_champion_id,
      difficulty:payload.difficulty,winner:payload.winner,life:[payload.player_life,payload.rival_life],
      id:payload.match_id,fun:payload.had_fun,comment:payload.comment,liked:payload.liked,unclear:payload.unclear
    },{
      name:"Playtest QA",champion:"dextral",rival:"sinistral",difficulty:"hard",winner:fixture.winner,
      life:fixture.life,id:fixture.save.id,fun:false,comment:"Probé el duelo final.",
      liked:"Las decisiones de posición.",unclear:"En el primer duelo."
    });
    assert.match(payload.game_version,/^round-shadow-sweep-v3(?:@[0-9a-f]{40}|-dev)$/);
    await feedback.getByRole("button",{name:"Continuar",exact:true}).click();
    await options.waitFor({state:"visible"});

    await page.setViewportSize({width:390,height:844});
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator(".splash-start").evaluate(el=>el.click());
    await page.getByRole("button",{name:/CONTINUAR PARTIDA/}).click();
    await chooseHandCard(page);
    await page.locator('.board-slot.player.drop-active[data-position="'+fixture.position+'"]').evaluate(el=>el.click());
    await banner.getByRole("button",{name:/CONTINUAR/}).click({timeout:30000});
    await feedback.getByRole("button",{name:"Omitir",exact:true}).click();
    await options.waitFor({state:"visible"});
    assert.equal(sent.length,2,"Skipping must not send a response");
    assert.deepEqual(errors,[]);
    console.log("PASS finale and feedback: real match, optional questionnaire, match metadata, retry and skip");
  }finally{await page.close();}
}

try{
  await runMatch("desktop",{width:1067,height:539},false);
  await runMatch("mobile",{width:390,height:844},true);
  await Promise.all([
    runStudy("desktop",{width:1600,height:900},"no-preference"),
    runStudy("mobile",{width:390,height:844},"reduce")
  ]);
  await runFinale();
  await runWelcome();
}finally{
  await browser.close();
}
