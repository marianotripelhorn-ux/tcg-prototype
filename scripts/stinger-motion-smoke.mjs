/**
 * Daggerlight: genuine desktop + mobile match, no engine mocking.
 * Verifies three compositor-driven grouped animations in the actual React app.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

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
  await page.locator(".dl-champion-start").evaluate(el=>el.click());
  await page.locator("main.app-shell.board-redesign-v1").waitFor({state:"attached",timeout:12000});
  await page.locator(".hand-zone .hand-card").first().waitFor({state:"attached",timeout:12000});
}

async function instrument(page){
  await page.evaluate(()=>{
    const root=document.querySelector("main.app-shell.board-redesign-v1");
    window.__motionCapture={
      phases:[],flights:[],ribbons:[],duelValues:{},wipe:null,swap:null,errors:[]
    };
    let lastPhase=null;
    let currentWipe=null;
    function read(){
      const m=window.__motionCapture;
      const phase=root?.dataset.boardPhase;
      if(phase&&phase!==lastPhase){
        lastPhase=phase;
        m.phases.push(phase);
        if(phase==="round-wipe-reveal"){
          const ink=document.querySelector(".dl-new-round-ink");
          const hand=document.querySelectorAll(".hand-zone .hand-card");
          const stage=document.querySelector(".dl-new-round-stage")?.getBoundingClientRect();
          const field=root?.querySelector(".arena-main")?.getBoundingClientRect();
          m.swap={
            time:performance.now(),
            sameInk:ink===currentWipe,
            inkTransform:ink?getComputedStyle(ink).transform:"",
            fullyCovered:!!ink && Math.abs(new DOMMatrix(getComputedStyle(ink).transform).m41)<2,
            handCount:hand.length,
            covered:!!stage&&!!field&&Math.abs(stage.left-field.left)<2&&Math.abs(stage.right-field.right)<2,
            newRound:root?.querySelector(".arena-top-center span b")?.textContent?.trim()??"",
            boardCardCount:root?.querySelectorAll(".board-slot .played-card").length??-1
          };
        }
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

      const ribbon=document.querySelector(".dl-duel-stinger");
      if(ribbon&&m.ribbons.length<4&&!ribbon.dataset.smokeCaptured){
        ribbon.dataset.smokeCaptured="true";
        const style=getComputedStyle(ribbon);
        const rect=ribbon.getBoundingClientRect();
        const frames=ribbon.getAnimations()[0]?.effect?.getKeyframes()??[];
        m.ribbons.push({
          rest:frames.filter(frame=>frame.computedOffset>.2&&frame.computedOffset<.78)
            .map(frame=>({offset:frame.computedOffset,transform:frame.transform})),
          duration:style.animationDuration,
          motion:style.animationName,
          shape:style.clipPath,background:style.backgroundColor,color:style.color,
          text:ribbon.innerText,
          playerPower:ribbon.dataset.playerPower,opponentPower:ribbon.dataset.opponentPower,
          outcome:ribbon.dataset.outcome,
          resultIsChild:!!ribbon.querySelector(".dl-duel-stinger-result"),
          width:rect.width,
          scoreDestination:style.getPropertyValue("--dl-score-x")!==""&&style.getPropertyValue("--dl-score-y")!==""
        });
      }

      const wipe=document.querySelector(".dl-new-round-stage");
      if(wipe&&!m.wipe){
        const ink=wipe.querySelector(".dl-new-round-ink");
        const style=ink?getComputedStyle(ink):null;
        const pseudo=ink?getComputedStyle(ink,"::after"):null;
        const rect=wipe.getBoundingClientRect();
        const field=root?.querySelector(".arena-main")?.getBoundingClientRect();
        currentWipe=ink;
        const cover=ink?.getAnimations()[0];
        m.wipe={
          coverMs:cover?.effect?.getTiming().duration??null,
          motion:style?.animationName,
          background:style?.backgroundColor,
          radius:pseudo?.borderRadius,
          text:ink?.querySelector(".dl-new-round-number")?.textContent?.trim(),
          font:ink?getComputedStyle(ink.querySelector(".dl-new-round-number")).fontFamily:"",
          white:ink?getComputedStyle(ink.querySelector(".dl-new-round-number")).color:"",
          covers:!!field&&Math.abs(rect.left-field.left)<2&&Math.abs(rect.right-field.right)<2,
          geometry:{
            stage:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width},
            field:field?{left:field.left,right:field.right,top:field.top,bottom:field.bottom,width:field.width}:null,
            parent:wipe.parentElement?.className,
            computed:{position:getComputedStyle(wipe).position,inset:getComputedStyle(wipe).inset},
          },
          groupedText:!!ink?.querySelector(".dl-new-round-number"),
          keyframes:cover?.effect?.getKeyframes().map(f=>f.transform)??[]
        };
        if(ink){
          const watchExit=new MutationObserver(()=>{
            const exit=ink.getAnimations()[0];
            m.wipe.exitMs=exit?.effect?.getTiming().duration??null;
            m.wipe.exitStart=performance.now();
            watchExit.disconnect();
          });
          watchExit.observe(ink,{attributes:true,attributeFilter:["style"]});
        }
      }
    }
    read();
    const watch=new MutationObserver(read);
    watch.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["data-board-phase","data-duel-beat"]});
  });
}

async function playCard(page){
  await page.locator('main[data-board-phase="idle"]').waitFor({state:"attached",timeout:14000});
  const first=page.locator(".hand-zone .hand-card").first();
  await first.waitFor({state:"visible",timeout:10000});
  await first.click();
  await page.locator(".card-zoom-overlay .zoom-actions .primary-button")
    .waitFor({state:"attached",timeout:7000});
  await page.locator(".card-zoom-overlay .zoom-actions .primary-button").evaluate(el=>el.click());
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
  const choice=page.locator(".board-quiero-stage .board-quiero-no");
  const mobile=page.locator(".hybrid-phone-quiero .secondary-button");
  if(await choice.count()){
    const banner=page.locator(".board-quiero-banner");
    assert.ok(await banner.count(),"Existing faction decision banner was lost");
    await choice.evaluate(el=>el.click());
    return true;
  }
  if(await mobile.count()){
    await mobile.evaluate(el=>el.click());
    return true;
  }
  return false;
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
    const hold=await page.waitForFunction(()=>{
      const ribbon=document.querySelector(".dl-duel-stinger");
      const time=ribbon?.getAnimations()[0]?.currentTime;
      if(typeof time!=="number"||time<225||time>=450)return null;
      const rect=ribbon.getBoundingClientRect();
      const shadow=document.querySelector(".duel-focus-screen");
      const plate=getComputedStyle(shadow,"::after");
      return {
        visibleWidth:Math.min(rect.right,innerWidth)-Math.max(rect.left,0),
        height:rect.height,
        angle:plate.clipPath,
        opacity:Number(plate.opacity)
      };
    },undefined,{timeout:8000});
    const frame=await hold.jsonValue();
    assert.ok(frame.visibleWidth>=viewport.width*.7&&frame.height>=120,
      label+": result must fill most of the viewport at its readable hold");
    assert.ok(frame.angle.startsWith("polygon")&&frame.opacity>=.95,
      label+": full-width diagonal result plate must visibly reach its hold");
    await page.screenshot({path:`/tmp/daggerlight-round-shadow-sweep-v3-${label}-duel.png`});
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
    assert.ok(ribbon&&ribbon.duration==="0.64s"&&ribbon.motion.includes("dl-duel-notched-ribbon"),
      label+": 640ms result animation missing");
    assert.ok(ribbon.rest.some((frame,i)=>{
      const next=ribbon.rest[i+1];
      return next&&frame.transform===next.transform&&next.offset-frame.offset>=.35;
    }),label+": grouped result needs a stable reading beat after settling");
    assert.ok(ribbon.shape.includes("polygon")&&ribbon.background==="rgb(8, 9, 11)",
      label+": original notched silhouette needs one matte-black surface");
    assert.equal(ribbon.color,"rgb(255, 255, 255)",label+": white result lettering");
    assert.ok(ribbon.resultIsChild && ribbon.playerPower!==undefined && ribbon.opponentPower!==undefined,
      label+": both final Poder values and actual outcome must move together");
    assert.ok(["player","opponent","draw"].includes(ribbon.outcome),
      label+": result must be the real engine outcome");
    const {approach,result,settle}=data.duelValues;
    assert.ok(approach&&result&&settle,label+": observe the complete duel handoff");
    assert.deepEqual(result.life,approach.life,label+": Life must hold through the ribbon");
    assert.deepEqual(result.score,approach.score,label+": score must hold through the ribbon");
    const win=ribbon.outcome!=="draw";
    assert.equal(ribbon.scoreDestination,win,label+": a decisive result targets the real score");
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
    for(const phase of ["flight","duel","round","archive","round-wipe","round-wipe-reveal","idle"])
      assert.ok(data.phases.includes(phase),label+": missing real match phase "+phase);
    const wipe=data.wipe,swap=data.swap;
    console.log("MOTION DIAGNOSTIC "+label+" "+JSON.stringify({wipe,swap}));
    assert.ok(wipe?.groupedText&&wipe.covers,label+": whole ivory field and hand must be covered: "+JSON.stringify(wipe?.geometry??wipe));
    assert.ok(wipe.coverMs===224&&wipe.keyframes.length===2,
      label+": curved stinger must enter in one 224ms compositor movement");
    assert.ok(wipe.exitMs===384&&wipe.exitStart-swap?.time>=150,
      label+": the round number needs a readable hold at full cover before the continuous exit");
    assert.ok(wipe.radius.includes("50%"),label+": broad curved front is missing");
    assert.equal(wipe.background,"rgb(9, 10, 11)",label+": background must be matte black");
    assert.ok(wipe.font.includes("Archivo Black")&&wipe.white==="rgb(255, 255, 255)",
      label+": new-round number must be white Archivo Black");
    assert.ok(swap?.sameInk&&swap.covered&&swap.fullyCovered,
      label+": same graphic must reach FULL cover before the real board/hand swap: "+JSON.stringify(swap));
    assert.ok(swap.handCount>=1&&swap.boardCardCount===0,
      label+": the actual new hand and cleared lanes must exist beneath the full-cover veil");
    assert.ok(await page.locator(".hand-zone .hand-card").count()>=1,
      label+": playable real new hand must be revealed");
    assert.ok(errors.length===0,label+": JavaScript runtime errors: "+errors.join(" | "));

    console.log("PASS "+label+": real card 270ms, notched duel 640ms, curved new-round 800ms, full-cover real board+hand swap");
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
        const states=window.__motionStudyStates={scenes:[],power:false,life:false};
        const read=()=>{
          const scene=field.dataset.scene;
          if(!states.scenes.includes(scene))states.scenes.push(scene);
          if(scene==="power"&&field.querySelector('[data-card="rival"] .live-power-badge b')?.textContent==="8")states.power=true;
          if(scene==="life"&&field.querySelector(".ms-score strong")?.textContent==="0–2" &&
            field.querySelector("[data-life=player] b")?.textContent==="7")states.life=true;
        };
        new MutationObserver(read).observe(field,{attributes:true,childList:true,subtree:true,characterData:true,attributeFilter:["data-scene"]});
        read();
      });
      await page.getByRole("button",{name:"Reproducir todo",exact:true}).click();
      await next("finish");
      await page.getByRole("button",{name:"Reproducir todo",exact:true}).waitFor({state:"visible"});
      const states=await page.evaluate(()=>window.__motionStudyStates);
      assert.equal(states.scenes.length,11,"Playback must show all match scenes");
      assert.ok(states.power&&states.life,"Power and Life must update during playback");
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
    await page.getByRole("button",{name:"Quiero / No quiero",exact:true}).click();
    await next("decision");
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

try{
  await runMatch("desktop",{width:1600,height:900},false);
  await runMatch("mobile",{width:390,height:844},true);
  await Promise.all([
    runStudy("desktop",{width:1600,height:900},"no-preference"),
    runStudy("mobile",{width:390,height:844},"reduce")
  ]);
}finally{
  await browser.close();
}
