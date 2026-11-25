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
  await page.locator(".home-action.action-play").evaluate(el=>el.click());
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
  assert.equal(await page.locator(".dl-deck-tile .dl-deck-object").count(),9,
    "All nine starter choices should be rendered as deck objects");
  assert.equal(await page.locator(".dl-deck-tile .dl-deck-object-front .dl-faction-card-back").count(),9,
    "Every starter deck must use the game's real faction card-back component");
  assert.equal(await page.locator(".dl-deck-tile .dl-deck-object-rear .dl-faction-card-back").count(),9,
    "Each deck needs a second stacked card back");
  assert.equal(await page.locator(".dl-deck-tile .dl-deck-object-champion").count(),9,
    "Every deck retains its overlapping Campeón portrait");
  const artComposition=await page.locator(".dl-deck-tile").first().evaluate(tile=>{
    const stage=tile.querySelector(".dl-deck-object");
    const back=tile.querySelector(".dl-deck-object-front");
    const portrait=tile.querySelector(".dl-deck-object-champion");
    const background=tile.querySelector(".dl-deck-object-environment");
    if(!stage||!back||!portrait||!background)return null;
    const b=back.getBoundingClientRect(),p=portrait.getBoundingClientRect();
    return {
      scene:getComputedStyle(background).backgroundImage,
      overlap:b.right>p.left && p.right>b.left,
      backgroundVisible:getComputedStyle(background).display!=="none",
      cardBackVisible:getComputedStyle(back).display!=="none",
      portraitVisible:getComputedStyle(portrait).display!=="none"
    };
  });
  assert.ok(artComposition?.scene.includes("/champions/backgrounds/"),
    "Deck objects must restore the existing faction background");
  assert.ok(artComposition?.overlap && artComposition.backgroundVisible &&
    artComposition.cardBackVisible && artComposition.portraitVisible,
    "Portrait and card-back stack should visibly overlap: "+JSON.stringify(artComposition));
  assert.equal(await page.locator(".dl-lib-inspector-art .dl-faction-card-back").count(),2,
    "Selected deck preview must also be a physical deck stack");
  const initialVisible=await page.locator(".dl-lib").innerText();
  assert.ok(!/\bChampion\b/i.test(initialVisible),"No English Champion label in Spanish UI");
  assert.ok(!/[✦✧★☆]/.test(initialVisible),"No star or sparkle symbols");
  assert.equal(await page.locator(".dl-lib-banner-visual img").count(),0,
    "No floating Campeón portrait in banner");
  await page.screenshot({path:"/tmp/daggerlight-deck-starters-desktop.png",fullPage:true});

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

  // Seed explicit fixtures for the profile UI; real production histories are never fabricated.
  await page.evaluate(()=>{
    const saved=JSON.parse(localStorage.getItem("daggerlight-deck-library-v1")||"[]");
    const favorite=saved.find(deck=>deck.favorite);
    const base={version:1,ruleset:"manifestaciones-v0.1-2026-11",startedAt:"2026-11-01T10:00:00Z",finishedAt:"2026-11-01T10:05:00Z",
      championId:"dextral",opponentId:"athos",difficulty:"normal",rounds:4,completedDuels:12,finalLife:3,opponentLife:0,auguryHits:0,auguryHeals:0,noQuiero:0,
      factions:["red","blue"],mixedDeck:true};
    localStorage.setItem("daggerlight-match-history-v1",JSON.stringify([
      {...base,id:"fixture-legacy",result:"loss"},
      {...base,id:"fixture-deck",result:"win",deckId:favorite.id,deckName:"Former name",mode:"solo"},
      {...base,id:"fixture-tutorial",result:"win",mode:"tutorial"}
    ]));
  });
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator(".splash-start").waitFor({state:"attached"});
  await page.locator(".splash-start").evaluate(el=>el.click());
  await page.locator(".home-action.action-decks").waitFor({state:"attached"});
  const homeProfile=page.locator(".fo-topbar .action-profile");
  assert.equal(await homeProfile.count(),1);
  assert.ok(await page.locator(".home-action.action-arcade").isVisible(),"Arcade is a primary solo mode");
  assert.ok(await page.locator(".home-action.action-collection").isVisible());
  await page.screenshot({path:"/tmp/daggerlight-deck-solo-home.png",fullPage:true});
  await homeProfile.click();
  await page.locator(".dl-profile").waitFor();
  assert.equal(await page.locator(".dl-avatar-picker button").count(),10);
  await page.locator(".dl-avatar-picker button").nth(1).click();
  const selectedAvatar=await page.evaluate(()=>localStorage.getItem("daggerlight-player-avatar-v1"));
  assert.ok(selectedAvatar,"Avatar selection persists locally");
  assert.equal(await page.locator(".dl-avatar-picker button[aria-pressed=true]").count(),1);
  assert.equal(await page.locator(".dl-profile-match").count(),2,"Guided match is excluded from profile");
  assert.ok((await page.locator(".dl-profile-score").innerText()).includes("50%"));
  await page.locator("#dl-player-name").fill("Vigilia");
  await page.getByRole("button",{name:"GUARDAR",exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem("daggerlight-lab-player-name-v1")),"Vigilia");
  await page.getByRole("tab",{name:"MAZOS",exact:true}).click();
  assert.ok((await page.locator(".dl-profile-table").innerText()).includes("La Última Vigilia"));
  assert.ok((await page.locator(".dl-profile-scroll").innerText()).includes("sin identificador de mazo"));
  await page.screenshot({path:"/tmp/daggerlight-deck-profile-desktop.png",fullPage:true});
  await page.getByRole("tab",{name:"CAMPEONES",exact:true}).click();
  assert.equal(await page.locator(".dl-profile-table-row").count(),9);
  await page.setViewportSize({width:390,height:844});
  const profileFit=await page.evaluate(()=>({h:document.documentElement.scrollHeight,w:document.documentElement.scrollWidth,vh:innerHeight,vw:innerWidth}));
  assert.ok(profileFit.h<=profileFit.vh+10 && profileFit.w<=profileFit.vw+8,"Profile fits mobile: "+JSON.stringify(profileFit));
  await page.screenshot({path:"/tmp/daggerlight-deck-profile-mobile.png",fullPage:true});
  await page.setViewportSize({width:1366,height:900});
  await page.locator(".dl-profile .fo-back").click();
  await page.locator(".home-action.action-arcade").evaluate(el=>el.click());
  await page.locator(".dl-lib-selection").waitFor();
  assert.ok((await page.locator(".dl-lib-banner h1").innerText()).includes("ARCADE"));
  assert.equal(await page.getByLabel("RIVAL",{exact:true}).count(),0);
  assert.ok((await page.locator(".dl-lib-play").innerText()).includes("INICIAR ARCADE"));
  await page.locator(".dl-lib-top .fo-back").click();
  await page.locator(".home-action.action-play").evaluate(el=>el.click());
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
  const mobileBanner=await page.locator(".dl-lib-banner").evaluate(el=>({
    backdrop:getComputedStyle(el).backgroundColor,
    oldOverlay:getComputedStyle(el.querySelector(".dl-lib-banner-copy"),"::before").content
  }));
  assert.equal(mobileBanner.backdrop,"rgb(244, 234, 219)",
    "Mobile title bar should be solid cream, not a green or dark gradient");
  assert.equal(mobileBanner.oldOverlay,"none",
    "No old mobile gradient overlay over the cream header");
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
  const matchIdentity=await page.evaluate(()=>JSON.parse(localStorage.getItem("daggerlight-match-save-v1")||"null")?.deckIdentity);
  assert.equal(matchIdentity?.name,"La Última Vigilia","The exact selected custom deck is stored with the new match");
  assert.deepEqual(errors,[],"Deck library should not throw browser errors");
  console.log("PASS: library, two-faction rules, save/duplicate/edit/favorite, reload, mobile and match");
} finally { await browser.close(); }
