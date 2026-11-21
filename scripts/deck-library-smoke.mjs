/**
 * Real-browser deck-library test. Uses the actual React UI and original engine,
 * without mocking selections, saves or match creation.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
  const page = await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  let ready=false;
  for(let attempt=0;attempt<30;attempt++){
    try {
      const response=await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded",timeout:2500});
      if(response?.ok()){ready=true;break;}
    } catch {}
    await page.waitForTimeout(300);
  }
  assert.ok(ready,"The Vite test server should start");

  await page.locator(".splash-start").waitFor({state:"attached"});
  await page.locator(".splash-start").evaluate(el=>el.click());
  const skip=page.getByRole("button",{name:"SALTAR TUTORIAL",exact:true});
  // The splash has a timed transition before the welcome screen is mounted.
  await page.waitForFunction(() => {
    const home = document.querySelector(".home-action.action-decks");
    const welcome = [...document.querySelectorAll("button")]
      .some(button => button.textContent?.includes("SALTAR TUTORIAL"));
    return Boolean(home || welcome);
  }, {timeout:15000});
  if(await skip.count()) await skip.evaluate(el=>el.click());
  await page.locator(".home-action.action-decks").waitFor({state:"attached",timeout:15000});
  await page.locator(".home-action.action-decks").evaluate(el=>el.click());
  await page.locator(".dl-lib-banner").waitFor({timeout:15000});
  assert.equal(await page.locator(".dl-deck-tile").count(),9,"Nine starter decks should be available");

  await page.locator(".dl-lib-banner .dl-lib-primary").evaluate(el=>el.click());
  await page.locator(".dl-build-name input").waitFor({timeout:10000});
  await page.locator(".dl-build-name input").fill("Guardia del Alba");
  await page.getByLabel("SEGUNDA FACCIÓN").selectOption("blue");
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),12,"New builder should start with starter recipe");
  await page.locator(".dl-build-card.theme-red.is-picked").first().click();
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),11);
  await page.locator(".dl-build-card.theme-blue:not(.is-picked)").first().click();
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),12);
  assert.ok(await page.locator(".dl-build-save").isEnabled(),"Valid two-faction deck should be saveable");
  await page.screenshot({path:"/tmp/daggerlight-deck-editor.png",fullPage:true});
  await page.locator(".dl-build-save").evaluate(el=>el.click());
  await page.locator(".dl-lib-inspector-content h2").getByText("Guardia del Alba").waitFor({timeout:10000});
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem("daggerlight-deck-library-v1")||"[]"));
  assert.equal(first.length,1);
  assert.equal(first[0].cardIds.length,24);
  assert.equal(new Set(first[0].cardIds).size,12);
  assert.equal(first[0].name,"Guardia del Alba");
  assert.ok(first[0].cardIds.some(id=>id.startsWith("protector"))||
    first[0].cardIds.some(id=>id==="protector"),"Deck should contain a blue card");
  await page.screenshot({path:"/tmp/daggerlight-deck-desktop.png",fullPage:true});

  await page.locator(".dl-lib-inspector-actions").getByRole("button",{name:"DUPLICAR"}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("daggerlight-deck-library-v1")||"[]").length),2);
  await page.locator(".dl-lib-inspector-actions").getByRole("button",{name:"EDITAR"}).click();
  await page.locator(".dl-build-name input").fill("La Última Vigilia");
  await page.locator(".dl-build-save").click();
  await page.locator(".dl-lib-inspector-content h2").getByText("La Última Vigilia").waitFor();
  await page.locator(".dl-deck-tile-wrap.is-active .dl-deck-favorite").click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("daggerlight-deck-library-v1")||"[]").filter(d=>d.favorite).length),1);

  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".splash-start").waitFor({state:"attached"});
  await page.locator(".splash-start").evaluate(el=>el.click());
  await page.locator(".home-action.action-decks").waitFor({state:"attached"});
  await page.locator(".home-action.action-decks").evaluate(el=>el.click());
  await page.locator(".dl-lib-inspector-content h2").getByText("La Última Vigilia").waitFor();
  assert.equal(await page.locator(".dl-deck-tile").count(),11,"Saved decks must survive reload");

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(200);
  await page.screenshot({path:"/tmp/daggerlight-deck-mobile.png",fullPage:true});
  const widths=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,viewport:window.innerWidth
  }));
  assert.ok(widths.document<=widths.viewport+8,
    "Mobile library must not force horizontal scrolling: "+JSON.stringify(widths));
  await page.locator(".dl-lib-play").evaluate(el=>el.click());
  await page.locator(".app-shell.board-redesign-v1").waitFor({timeout:12000});
  assert.deepEqual(errors,[],"Deck library should not throw browser errors");
  console.log("PASS: library, two-faction rules, save/duplicate/edit/favorite, reload, mobile and match");
} finally { await browser.close(); }
