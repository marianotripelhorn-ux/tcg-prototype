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
  await page.locator(".splash-start").click({timeout:12000});
  await page.locator(".home-action.action-play").click({timeout:12000});
  await page.locator(".dl-champion-card").first().click({timeout:12000});
  await page.locator(".dl-champion-start").click({timeout:12000});
  const arena=page.locator(".app-shell.board-redesign-v1");
  await arena.waitFor({timeout:15000});
  await page.locator(".hybrid-right-rail .hybrid-life-unit").first().waitFor({timeout:10000});
  assert.equal(await page.locator(".hybrid-champion-panel .board-gs-banner-overlay").count(),2,
    "Real React Champion panels should carry the approved fabric sweep and full circles");
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
  assert.equal(await page.locator(".duel-showcase-card").count(),2,
    "Real duel must contain the two original printed cards");
  await page.locator(".duel-showcase-skip").click();
  await page.locator(".duel-cinematic").waitFor({timeout:8000});
  assert.equal(await page.locator(".duel-cinematic-ring").count(),2,
    "Result should display two complete rings, never fantasy glyph symbols");
  await page.locator(".duel-cinematic").click();
  await page.waitForTimeout(1000);

  assert.deepEqual(pageErrors,[],"The real playable board must not throw browser errors");
  await page.screenshot({path:"/tmp/daggerlight-board-gold-shadow-smoke.png",fullPage:true});
  console.log("PASS: real AI duel, resolved result, approved full-circle visuals, no JS errors");
}finally{
  await browser.close();
}
