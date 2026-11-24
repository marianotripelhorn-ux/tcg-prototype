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
  const starterLabels=await page.locator(".dl-deck-tile-copy strong").allTextContents();
  assert.ok(starterLabels.includes("Empíreos — Desartes"),"Starter label uses faction and short name only");
  assert.ok(starterLabels.includes("Santos — Tellet"),"Santos starter naming follows the same hierarchy");
  assert.ok(starterLabels.every(name=>!name.includes("Mazo inicial")&&!name.includes(",")),
    "Starter tiles must not repeat Mazo inicial or full Champion subtitles");
  const tileHeights=await page.locator(".dl-deck-tile").evaluateAll(tiles=>
    tiles.map(tile=>Math.round(tile.getBoundingClientRect().height)));
  assert.ok(Math.max(...tileHeights)-Math.min(...tileHeights)<=1,
    "All starter cards must have exactly the same height: "+JSON.stringify(tileHeights));
  const initialVisible=await page.locator(".dl-lib").innerText();
  assert.ok(!/\bChampion\b/i.test(initialVisible),"No English Champion label in Spanish UI");
  assert.ok(!/[✦✧★☆]/.test(initialVisible),"No star or sparkle symbols");
  assert.equal(await page.locator(".dl-lib-banner-visual img").count(),0,
    "No floating Champion portrait in banner");

  await page.locator(".dl-lib-banner .dl-lib-primary").evaluate(el=>el.click());
  await page.locator(".dl-build-name input").waitFor({timeout:10000});
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),0,
    "Crear mazo must open an entirely empty deck");
  assert.ok(!(await page.locator(".dl-build-save").isEnabled()),"Empty deck cannot be saved");
  await page.getByLabel("CAMPEÓN").selectOption("athos");
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),0,
    "Changing Campeón must not silently populate the deck");
  await page.getByLabel("CAMPEÓN").selectOption("dextral");
  await page.locator(".dl-build-name input").fill("Guardia del Alba");
  await page.getByLabel("SEGUNDA FACCIÓN").selectOption("blue");
  for(let i=0;i<6;i++){
    await page.locator(".dl-build-card.theme-red:not(.is-picked)").first().click();
  }
  for(let i=0;i<6;i++){
    await page.locator(".dl-build-card.theme-blue:not(.is-picked)").first().click();
  }
  assert.equal(await page.locator(".dl-build-card.is-picked").count(),12);
  assert.ok(!(await page.locator(".dl-lib").innerText()).includes("CHAMPION"),
    "The editor must use CAMPEÓN, never CHAMPION");
  assert.ok(await page.locator(".dl-build-save").isEnabled(),"Valid two-faction deck should be saveable");
  const editorDesktopDims=await page.evaluate(()=>({content:document.documentElement.scrollHeight,visible:innerHeight}));
  assert.ok(editorDesktopDims.content<=editorDesktopDims.visible+10,
    "Desktop builder should fit inside the window: "+JSON.stringify(editorDesktopDims));
  await page.screenshot({path:"/tmp/daggerlight-deck-editor.png",fullPage:true});
  const editorDesktop = await page.evaluate(()=>({
    scroll:document.documentElement.scrollHeight,viewport:innerHeight
  }));
  assert.ok(editorDesktop.scroll<=editorDesktop.viewport+10,
    "Desktop deck builder must fit the viewport: "+JSON.stringify(editorDesktop));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(150);
  await page.screenshot({path:"/tmp/daggerlight-deck-editor-mobile.png",fullPage:true});
  const editorMobile=await page.evaluate(()=>({
    scroll:document.documentElement.scrollHeight,viewport:innerHeight,
    width:document.documentElement.scrollWidth,screenWidth:innerWidth
  }));
  assert.ok(editorMobile.scroll<=editorMobile.viewport+10,
    "Mobile builder should scroll internally, not the whole page: "+JSON.stringify(editorMobile));
  assert.ok(editorMobile.width<=editorMobile.screenWidth+8,
    "Mobile builder should not overflow horizontally: "+JSON.stringify(editorMobile));
  await page.getByRole("tab",{name:/MI MAZO/}).click();
  await page.locator(".dl-build-view-deck .dl-build-summary").waitFor({state:"visible"});
  await page.getByRole("tab",{name:"COLECCIÓN"}).click();
  await page.setViewportSize({width:1366,height:900});
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
  assert.equal(await page.locator(".dl-deck-tile").count(),2,"Saved deck tab contains both saved decks after reload");
  await page.getByRole("tab",{name:/MAZOS INICIALES/}).click();
  assert.equal(await page.locator(".dl-deck-tile").count(),9,"Starter decks remain available in the separate tab");
  await page.getByRole("tab",{name:/MIS MAZOS/}).click();
  assert.equal(await page.locator(".dl-deck-tile").count(),2,"Saved decks remain available");

  const desktopDims=await page.evaluate(()=>({
    content:document.documentElement.scrollHeight,visible:innerHeight
  }));
  assert.ok(desktopDims.content<=desktopDims.visible+10,
    "Desktop loadout should fit the screen instead of scrolling: "+JSON.stringify(desktopDims));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(200);
  await page.screenshot({path:"/tmp/daggerlight-deck-mobile.png",fullPage:true});
  const widths=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,viewport:window.innerWidth
  }));
  assert.ok(widths.document<=widths.viewport+8,
    "Mobile library must not force horizontal scrolling: "+JSON.stringify(widths));
  const mobileDims=await page.evaluate(()=>({
    content:document.documentElement.scrollHeight,visible:innerHeight
  }));
  assert.ok(mobileDims.content<=mobileDims.visible+10,
    "Mobile loadout should fit the screen: "+JSON.stringify(mobileDims));
  await page.locator(".dl-lib-manage-trigger").click();
  await page.locator(".dl-lib-inspector-actions").getByRole("button",{name:"EDITAR"}).click();
  await page.locator(".dl-build-name input").waitFor({timeout:10000});
  const mobileEditorDims=await page.evaluate(()=>({
    content:document.documentElement.scrollHeight,visible:innerHeight,
    width:document.documentElement.scrollWidth,viewport:innerWidth
  }));
  assert.ok(mobileEditorDims.content<=mobileEditorDims.visible+10 &&
    mobileEditorDims.width<=mobileEditorDims.viewport+8,
    "Mobile builder must use compact tabs, not page scroll: "+JSON.stringify(mobileEditorDims));
  await page.screenshot({path:"/tmp/daggerlight-builder-mobile-cards.png",fullPage:true});
  await page.getByRole("tab",{name:/MI MAZO/}).click();
  assert.ok(await page.locator(".dl-build-summary").isVisible(),
    "The selected deck must remain reachable through the mobile tab");
  await page.screenshot({path:"/tmp/daggerlight-builder-mobile-deck.png",fullPage:true});
  await page.locator(".dl-lib-editor .fo-back").evaluate(el=>el.click());
  await page.locator(".dl-lib-play").evaluate(el=>el.click());
  await page.locator(".app-shell.board-redesign-v1").waitFor({timeout:12000});
  assert.deepEqual(errors,[],"Deck library should not throw browser errors");
  console.log("PASS: library, two-faction rules, save/duplicate/edit/favorite, reload, mobile and match");
} finally { await browser.close(); }
