/**
 * Daggerlight Shadow Sweep v2 / real React board browser integration test.
 * Starts a genuine AI match and uses the normal card-selection path. It never
 * mocks the game engine or manually changes Life/Power/Archive state.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser=await chromium.launch({
  headless:true,
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]
});
try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const pageErrors=[];
  page.on("pageerror",error=>pageErrors.push(error.message));
  const url="http://127.0.0.1:4173/";
  let online=false;
  for(let attempts=0;attempts<25;attempts++){
    try{
      const r=await page.goto(url,{waitUntil:"domcontentloaded",timeout:3000});
      if(r?.ok()){online=true;break}
    }catch{}
    await page.waitForTimeout(300);
  }
  assert.ok(online,"Vite preview did not start");
  // Existing menu uses substantial entry motion. Dispatch the same React
  // click handlers after mounting instead of fighting menu transform stability.
  await page.locator(".splash-start").evaluate(el=>el.click());
  await page.locator(".home-action.action-play").waitFor({state:"attached",timeout:15000});
  await page.locator(".home-action.action-play").evaluate(el=>el.click());
  await page.locator(".dl-champion-card").first().waitFor({state:"attached",timeout:15000});
  await page.locator(".dl-champion-card").first().evaluate(el=>el.click());
  await page.locator(".dl-champion-start").waitFor({state:"attached",timeout:15000});
  await page.locator(".dl-champion-start").evaluate(el=>el.click());
  const arena=page.locator(".app-shell.board-redesign-v1");
  await arena.waitFor({timeout:15000});
  await page.locator(".hybrid-right-rail .hybrid-life-unit").first().waitFor({timeout:10000});
  assert.equal(await page.locator(".hybrid-champion-panel .board-gs-banner-overlay").count(),2,
    "Real React Champion panels should carry the approved fabric sweep and full circles");
  // Hover must NOT expand Champions, but direct click must.
  const sideOpponent=page.locator(".hybrid-champion-panel.opponent");
  const sidePlayer=page.locator(".hybrid-champion-panel.player");
  assert.ok((await sidePlayer.getAttribute("class"))?.includes("is-expanded"),"Player banner initially expanded");
  await sideOpponent.hover();
  await page.waitForTimeout(120);
  assert.ok((await sideOpponent.getAttribute("class"))?.includes("is-compact"),
    "Opponent Champion must not expand on hover");
  await sideOpponent.locator(".hybrid-champion-trigger").click();
  assert.ok((await sideOpponent.getAttribute("class"))?.includes("is-expanded"),
    "Opponent Champion must expand by click");
  await sidePlayer.locator(".hybrid-champion-trigger").click();
  assert.ok((await sidePlayer.getAttribute("class"))?.includes("is-expanded"),
    "Player Champion should expand again on click");
  const fabricDisplay=await sidePlayer.locator(".hybrid-banner-fabric")
    .evaluate(el=>getComputedStyle(el).display);
  assert.equal(fabricDisplay,"block",
    "The fabric must remain mounted for smooth opening AND closing transitions");
  const bannerWindow=sidePlayer.locator(".hybrid-champion-figure-window");
  const panelRect=await sidePlayer.boundingBox();
  const windowRect=await bannerWindow.boundingBox();
  assert.ok(panelRect&&windowRect&&windowRect.y>panelRect.y+panelRect.height*.48,
    "The character illustration must remain in the bottom portion of its banner");

  const command=page.locator(".hybrid-command-rail");
  const commandBox=await command.boundingBox();
  assert.ok(commandBox && commandBox.x<=2 &&
    commandBox.width>=1595,"Textured bottom command ribbon must span entire viewport");
  const commandBg=await command.evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(commandBg.includes("url("),"Bottom ribbon should reuse the Champion banner artwork");

  const score=page.locator(".hybrid-duel-tally");
  const scoreText=score.locator("strong");
  const scoreFits=await score.evaluate(el=>{
    const num=el.querySelector("strong");
    if(!num)return false;
    const a=el.getBoundingClientRect(),b=num.getBoundingClientRect();
    return b.left>=a.left && b.right<=a.right+1;
  });
  assert.ok(scoreFits,"Score numerals must fit completely inside the side banner");
  const scoreSpacing=await score.locator(".hybrid-score-values").evaluate(el=>{
    const parts=Array.from(el.children).map(child=>child.getBoundingClientRect());
    return parts.length===3&&parts[0].right+3<parts[1].left&&parts[1].right+3<parts[2].left;
  });
  assert.ok(scoreSpacing,"Both score numerals must have clear space around the center dash");

  const currentLife=await page.locator(".hybrid-life-unit.player .hybrid-life-number").textContent();
  assert.ok(currentLife?.trim(),"Real Champion Life must be present");
  assert.ok(await page.locator(".hand-zone .hand-card").count()>0,"Game has real cards in hand");
  const ringStyle=await page.evaluate(()=>{
    const style=[...document.styleSheets].find(sheet=>{
      try{return [...sheet.cssRules].some(rule=>rule.cssText.includes("gs-flight-ring"))}catch{return false}
    });
    return !!style;
  });
  assert.ok(ringStyle,"The new board gold/ink motion stylesheet must be loaded");
  const compassValue=await page.locator(".hybrid-engraving")
    .evaluate(el=>getComputedStyle(el).getPropertyValue("--hybrid-compass-offset").trim());
  assert.ok(compassValue.endsWith("px"),"Compass image must align to measured ribbon center");

  await page.locator(".hand-zone .hand-card").first().click();
  await page.locator(".card-zoom-overlay .zoom-actions .primary-button").click({timeout:8000});
  const available=page.locator(".board-slot.player.drop-active");
  await available.first().waitFor({timeout:8000});
  await available.first().click();
  const flight=page.locator(".board-motion-flight .board-gs-flight-ring");
  await flight.first().waitFor({state:"attached",timeout:5500});
  assert.equal(await flight.count(),3,"The played physical card must have three complete ring traces");
  console.log("PASS: real React board + card placement Gold & Shadow flight");

  const duel=page.locator(".duel-showcase-overlay");
  await duel.waitFor({timeout:12000});
  const overlayBg=await duel.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.ok(overlayBg==="rgba(0, 0, 0, 0)"||overlayBg==="transparent",
    "Duel must not cover the board with the previous dark rectangle");
  const liftCount=await page.locator(".duel-showcase-card").first()
    .evaluate(el=>el.getAnimations().length);
  assert.ok(liftCount>0,"The real printed cards must lift from their board slots into the middle");
  assert.equal(await page.locator(".duel-showcase-card").count(),2,
    "Real duel must contain the two original printed cards");
  assert.equal(await page.locator(".duel-showcase-details:visible").count(),0,
    "Face-off must not show an extra card/champion name plaque");

  // Focus is a separate, semi-transparent full-screen layer: the two cards
  // remain crisp above the scrim, and the real board is still behind them.
  const scrim=duel.locator(".duel-focus-screen");
  assert.equal(await scrim.count(),1,"The duel focus layer must be present");
  const focus=await scrim.evaluate(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return {position:s.position,blur:s.backdropFilter,z:s.zIndex,width:r.width,height:r.height};
  });
  assert.equal(focus.position,"fixed","Focus layer must be fixed to the viewport");
  assert.ok(focus.blur.includes("blur("),"Focused duel blur must be applied to the board only");
  const contrast=await scrim.evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(contrast.includes("radial-gradient")&&contrast.includes("0.84"),
    "The full-page focus must carry visibly deep dark shadow, not pale grey");
  assert.equal(focus.z,"0","Duel scrim must paint ABOVE the ivory board, not behind it");
  assert.ok(focus.blur.includes("4.5px"),"Duel blur should be substantially stronger than v1.1");
  assert.equal(await duel.locator(".duel-showcase-heading").count(),0,
    "Remove redundant DUELO / RESOLUCIÓN DE PODER headings, not the result");
  assert.ok(focus.width>1000&&focus.height>500,"Focus should cover the full viewport");
  assert.equal(await duel.locator(".duel-showcase-versus").count(),0,
    "The generic VS lettering must be removed, not merely disguised");
  assert.equal(await duel.locator(".duel-effect-column").count(),2,
    "Each card should have its own external explanation column");
  const layout=await duel.locator(".duel-showcase-pair").evaluate(el=>getComputedStyle(el).display);
  assert.equal(layout,"grid","External notes and both cards must use a deliberate four-column layout");
  // The longer approach is intentional. Check physical layout only once both
  // lifted cards have reached their final face-off geometry.
  await page.locator('.duel-showcase-overlay[data-duel-beat="player-power"]')
    .waitFor({state:"attached",timeout:6000});
  const panelLayout=await duel.evaluate(el=>{
    const names=[".duel-effect-column-player",".duel-choreo-side-player",
      ".duel-choreo-side-opponent",".duel-effect-column-opponent"];
    return names.map(name=>el.querySelector(name)?.getBoundingClientRect()).map(r=>({left:r?.left??0,right:r?.right??0}));
  });
  assert.ok(panelLayout[0].right<panelLayout[1].left &&
            panelLayout[2].right<panelLayout[3].left,
    "All ability notes must be located beyond the outside edges of the cards");
  assert.equal(await duel.locator(".duel-choreo-causes").count(),0,
    "Remove the old unreadable explanations below the cards");
  const sideColors=await duel.locator(".duel-showcase-side").evaluateAll(els=>
    els.map(el=>getComputedStyle(el).color));
  assert.ok(sideColors.every(color=>color==="rgb(255, 254, 245)"),
    "Player and rival captions must be high-contrast ivory, not ochre on grey");

  const sound=page.locator(".duel-sfx-toggle");
  assert.equal(await sound.count(),1,"An accessible sound toggle must be present");
  assert.equal(await sound.getAttribute("aria-pressed"),"true","Audio should initially be enabled");
  await sound.click();
  assert.equal(await sound.getAttribute("aria-pressed"),"false","Sound must be muteable");
  await sound.click();
  assert.equal(await sound.getAttribute("aria-pressed"),"true","Sound must be re-enableable");
  assert.equal(await page.locator(".duel-showcase-card[data-duel-side]").count(),2,
    "Both players should have independent power-reveal stages");
  await page.locator(".duel-showcase-outcome").waitFor({state:"visible",timeout:9000});
  assert.equal(await duel.getAttribute("data-duel-beat"),"result",
    "The centralized timeline should reach result without manual intervention");
  assert.equal(await page.locator(".duel-showcase-card[data-power-state='final']").count(),2,
    "Both real final Power values must be visible at the result");
  assert.equal(await duel.locator(".duel-effect-column").count(),2,
    "The two outside explanation areas must survive until the outcome");
  // Do not interrupt a timed duel with an expensive software-rendered screenshot.
  assert.equal(await page.locator(".board-gs-damage-channel").count(),0,
    "The old line traveling to the Champion Life crest must be removed");
  assert.equal(await page.locator(".duel-cinematic").count(),0,
    "The React board outcome should stay inside the card face-off, not create a second overlay");
  assert.equal(await page.locator(".duel-showcase-card").count(),2,
    "Both original cards must remain visible while the duel result appears");
  const resultPos=await page.evaluate(()=>{
    const title=document.querySelector(".duel-showcase-outcome");
    const card=document.querySelector(".duel-showcase-face");
    const a=title?.getBoundingClientRect(),b=card?.getBoundingClientRect();
    return !!a&&!!b&&a.bottom<b.top;
  });
  assert.ok(resultPos,"Outcome word must appear ABOVE both cards");
  // Continue through the visible settle beat instead of abruptly dismissing
  // the lifted card faces. Then the existing real board/Archive flow resumes.
  await page.locator(".duel-showcase-skip").click();
  await page.locator('.duel-showcase-overlay[data-duel-beat="settle"]')
    .waitFor({state:"attached",timeout:2000});
  await page.locator(".duel-showcase-overlay").waitFor({state:"detached",timeout:3000});
  await page.waitForTimeout(700);
  const badges=page.locator(".current-board-card .live-power-badge");
  if(await badges.count()){
    const top=await badges.first().evaluate(el=>parseFloat(getComputedStyle(el).top));
    assert.ok(top>=0&&top<10,"Current final Power must cover the printed upper-left Power");
  }
  const shieldCount=await page.locator(".battle-card .battle-crown:visible").count();
  assert.equal(shieldCount,0,"Previously played compact cards must not display shield icons");
  for(const side of ["opponent","player"]){
    const stack=page.locator(`.board-slot.${side} .slot-stack`).first();
    const direction=await stack.evaluate(el=>({
      align:getComputedStyle(el).justifyContent,
      flex:getComputedStyle(el).flexDirection
    }));
    assert.ok(["flex-end","flow-end"].includes(direction.align),
      side+" previously played cards must attach to the center ribbon");
    assert.equal(direction.flex,side==="player"?"column-reverse":"column");
    const historic=stack.locator(".battle-card").first();
    if(await historic.count()){
      const size=await historic.evaluate(el=>{
        const card=el.getBoundingClientRect(),slot=el.closest(".board-slot")?.getBoundingClientRect();
        return {ratio:slot?.width?card.width/slot.width:0};
      });
      assert.ok(size.ratio>.6,side+" historical card should be nearly as wide as its slot");
    }
  }

  assert.deepEqual(pageErrors,[],"The real playable board must not throw browser errors");
  // Headless software screenshots can stall the game clock; the real DOM and
  // animation semantics are verified directly instead.
  console.log("PASS: deeper focused duel, clean side explanations, no heading and slower reveal");

  // The next part uses genuine, AI-resolved gameplay. Observe phase changes
  // instead of altering GameState or faking Archive quantities.
  await page.evaluate(()=>{
    const root=document.querySelector("main.app-shell");
    window.__daggerlightPhaseLog=[];
    const record=()=>{
      const phase=root?.getAttribute("data-board-phase");
      if(phase && window.__daggerlightPhaseLog.at(-1)!==phase)
        window.__daggerlightPhaseLog.push(phase);
    };
    record();
    new MutationObserver(record).observe(root,{
      attributes:true,attributeFilter:["data-board-phase"]
    });
  });

  let completedRound=false;
  for(let attempt=0;attempt<4;attempt++){
    if((await page.evaluate(()=>window.__daggerlightPhaseLog)).includes("round")){
      completedRound=true;break;
    }
    await page.locator('main[data-board-phase="idle"]').waitFor({state:"attached",timeout:14000});
    const decline=page.locator(".hybrid-quiero-actions button").filter({hasText:"NO QUIERO"});
    if(await decline.count()){
      await decline.evaluate(el=>el.click());
    }else{
      await page.locator(".hand-zone .hand-card").first().click();
      await page.locator(".card-zoom-overlay .zoom-actions .primary-button").click({timeout:10000});
      const legal=page.locator(".board-slot.player.drop-active");
      await legal.first().waitFor({timeout:9000});
      await legal.first().click();
      await duel.waitFor({state:"attached",timeout:15000});
      // Use the actual React button handlers without waiting for the
      // temporarily moving overlay to be geometrically stable.
      await duel.locator(".duel-showcase-skip").evaluate(el=>el.click());
      await duel.locator(".duel-showcase-outcome").waitFor({state:"attached",timeout:7000});
      await duel.locator(".duel-showcase-skip").evaluate(el=>el.click());
      await duel.waitFor({state:"detached",timeout:4500});
      console.log("PASS: follow-up real duel "+(attempt+2)+" completed");
    }
    const history=await page.evaluate(()=>window.__daggerlightPhaseLog);
    if(history.includes("round")){completedRound=true;break;}
  }
  assert.ok(completedRound,"A real completed AI round must start the round ceremony");

  await page.locator('main[data-board-phase="round"]').waitFor({state:"attached",timeout:7000});
  const ceremony=page.locator(".board-round-transition");
  assert.equal(await ceremony.count(),1,"Round-end ceremony must be visible before Archive movement");
  assert.equal(await ceremony.locator(".board-round-score").count(),1,
    "Round ceremony must show the actual end-of-round duel score");
  const roundVisual=await ceremony.evaluate(el=>{
    const area=el.getBoundingClientRect();
    const stage=el.closest(".arena-stage").getBoundingClientRect();
    const board=el.closest(".arena-stage").querySelector(".battlefield").getBoundingClientRect();
    const score=el.querySelector(".board-round-score");
    const callout=el.querySelector(".board-round-ceremony");
    return {
      stageRatio:area.width/stage.width,heightRatio:area.height/stage.height,
      widerThanOldBox:area.width/board.width,
      underStage:el.parentElement?.classList.contains("arena-stage"),
      shadow:getComputedStyle(el,"::before").backgroundImage,
      scoreColor:getComputedStyle(score).color,
      calloutBackground:getComputedStyle(callout).backgroundColor,
      scoreContrast:getComputedStyle(score).textShadow
    };
  });
  assert.ok(roundVisual.underStage && roundVisual.stageRatio>.67 &&
    roundVisual.heightRatio>.96 && roundVisual.widerThanOldBox>1.1,
    "The round shadow must cover the playable arena, not the old small rectangle");
  assert.ok(roundVisual.shadow.includes("linear-gradient")&&roundVisual.shadow.includes("0.93"),
    "Entire battlefield should darken strongly without an extra card");
  assert.equal(roundVisual.scoreColor,"rgb(255, 253, 244)",
    "Round score must read white against the full-field dark shadow");
  assert.equal(roundVisual.calloutBackground,"rgba(0, 0, 0, 0)",
    "Result content must not sit inside any floating panel or box");
  const oldRoundLabels=await page.evaluate(()=>({
    top:document.querySelector(".arena-top-center span b")?.textContent?.trim(),
    ribbon:document.querySelector(".hybrid-command-round b")?.textContent?.trim()
  }));
  assert.ok(oldRoundLabels.top&&oldRoundLabels.top===oldRoundLabels.ribbon,
    "Top status and command rail must both show the actual still-physical round");

  await page.locator('main[data-board-phase="archive"]').waitFor({state:"attached",timeout:8000});
  const archival=page.locator(".board-slot .played-card.board-gs-archiving");
  await archival.first().waitFor({state:"attached",timeout:3000});
  assert.ok(await archival.count()>=2,"Actual played cards must move toward their own Archives");
  const curtain=page.locator(".arena-stage > .board-archive-sweep");
  await curtain.waitFor({state:"attached",timeout:2000});
  const sweepVisual=await curtain.evaluate(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return {animation:s.animationName,width:r.width,backdrop:s.backdropFilter,clip:s.clipPath};
  });
  assert.ok(sweepVisual.animation.includes("dl-archive-shadow-to-score"),
    "The old static dark box must be replaced by a score-bound sweeping curtain");
  assert.ok(sweepVisual.width>800 && sweepVisual.clip.includes("polygon"),
    "Curtain must be stage-wide and clipped as it converges on the real score");
  const tallyPulse=await page.locator(".hybrid-duel-tally").evaluate(el=>
    getComputedStyle(el).animationName);
  assert.ok(tallyPulse.includes("dl-score-absorbs-shadow"),
    "Score rail must visually receive the traveling shadow");

  await page.locator('main[data-board-phase="archive-reveal"]')
    .waitFor({state:"attached",timeout:10000});
  assert.equal(await page.locator(".board-archive-receipt").count(),1,
    "Real Archive receipt remains available to assistive technologies");
  const receipt=await page.locator(".board-archive-receipt").evaluate(el=>
    ({clipped:getComputedStyle(el).clipPath,visibleWidth:el.getBoundingClientRect().width}));
  assert.ok(receipt.clipped.includes("inset(50%)")&&receipt.visibleWidth<=1,
    "Do not paint an additional floating golden Archive caption");
  assert.ok(await page.locator(".board-slot.archive-updated .archive-count").count()>0,
    "At least one genuinely changed Archive counter should highlight after capture");
  const newRoundLabels=await page.evaluate(()=>({
    top:document.querySelector(".arena-top-center span b")?.textContent?.trim(),
    ribbon:document.querySelector(".hybrid-command-round b")?.textContent?.trim()
  }));
  assert.ok(newRoundLabels.top&&newRoundLabels.top===newRoundLabels.ribbon &&
    newRoundLabels.top!==oldRoundLabels.top,
    "Both displayed round labels must advance together when Archive receipts are visible");
  assert.equal(await page.locator(".board-slot .played-card").count(),0,
    "Archived cards must leave the board before counts are confirmed");

  await page.locator('main[data-board-phase="deal"]').waitFor({state:"attached",timeout:5500});
  await page.locator('main[data-board-phase="idle"]').waitFor({state:"attached",timeout:10000});
  assert.ok(await page.locator(".hand-zone .hand-card").count()>=1,
    "The next real playable hand should be present after dealing");
  const phases=await page.evaluate(()=>window.__daggerlightPhaseLog);
  for(const phase of ["round","archive","archive-reveal","deal","idle"])
    assert.ok(phases.includes(phase),"Real match must include "+phase+" stage");
  assert.deepEqual(pageErrors,[],"Full round and Archive must have no runtime errors");
  console.log("PASS: high-contrast full-board shadows, rightward score sweep, true Archives and new hand");
}finally{
  await browser.close();
}
