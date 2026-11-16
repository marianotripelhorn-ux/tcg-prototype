/**
 * Daggerlight Gold & Shadow / real React board browser integration test.
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
  await page.locator(".duel-showcase-skip").click();
  await page.locator(".duel-showcase-outcome").waitFor({state:"visible",timeout:8000});
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
  assert.ok(resultPos,"Outcome word must appear ABOVE the two cards, below round and duel header");
  await page.locator(".duel-showcase-skip").click();
  await page.waitForTimeout(1000);
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
  await page.screenshot({path:"/tmp/daggerlight-board-gold-shadow-smoke.png",fullPage:true});
  console.log("PASS: React v3: top-aligned cards, spaced score, persistent face-off and high result title, continuous banner transitions");
}finally{
  await browser.close();
}
