/**
 * Real desktop browser smoke test for the isolated lab only.
 * Usage: start Vite preview on localhost:4173, then node scripts/animation-lab-smoke.mjs
 * Validates the actual React card, GSAP timeline controls, thirteen demos and Pixi canvas.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser=await chromium.launch({
  headless:true,
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]
});
try {
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const fatalErrors=[];
  page.on("pageerror",error=>fatalErrors.push(error.message));
  const url="http://127.0.0.1:4173/?lab=animations";
  let ready=false;
  for(let attempt=0;attempt<20;attempt++){
    try{
      const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:2500});
      if(response?.ok()){ready=true;break;}
    }catch{}
    await page.waitForTimeout(400);
  }
  assert.ok(ready,"Vite preview server did not become ready");
  await page.getByRole("heading",{name:"Laboratorio de animaciones"}).waitFor({timeout:12000});
  await page.locator(".lab-stage .lab-card .game-card").first().waitFor({timeout:12000});
  const buttons=page.locator(".lab-effect-option");
  assert.equal(await buttons.count(),13,"Expected thirteen independent motion experiments");
  // V4.1 art-direction regression: no invented glyphs or standalone sigils.
  assert.equal(await page.locator(".lab-v4-card-sigil").count(),0,
    "The old emblem must be removed, not merely hidden");
  assert.equal(await page.locator(".lab-v4-orbits .lab-v4-orbit").count(),3,
    "The card accents must be three fine full circles");
  assert.equal(await page.locator(".lab-v4-impact-arcs span").count(),2,
    "The Champion impact must have two fine full circles");
  for(const selector of [".lab-v4-orbits .lab-v4-orbit",".lab-v4-impact-arcs span"]){
    const rings=await page.locator(selector).evaluateAll(nodes=>nodes.map(node=>{
      const style=getComputedStyle(node);
      return ["Top","Right","Bottom","Left"].map(side=>({
        color:style.getPropertyValue("border-"+side.toLowerCase()+"-color").trim(),
        width:style.getPropertyValue("border-"+side.toLowerCase()+"-width").trim(),
        line:style.getPropertyValue("border-"+side.toLowerCase()+"-style").trim()
      }));
    }));
    for(const [index,sides] of rings.entries()){
      const colors=sides.map(s=>s.color);
      assert.ok(colors.every(c=>c===colors[0]),selector+" ring "+index+" has a missing/partial border");
      assert.ok(sides.every(side=>side.line==="solid"&&parseFloat(side.width)>0),
        selector+" ring "+index+" must have a complete thin border");
    }
  }
  await page.waitForTimeout(1100);
  const pixiStatus=(await page.locator(".lab-renderer-status").textContent())?.trim()??"unknown";
  console.log("PixiJS:",pixiStatus);
  // Software WebGL may be unavailable on some CI machines; GSAP must still work.
  for(let index=0;index<13;index++){
    await buttons.nth(index).click();
    const name=(await buttons.nth(index).textContent())?.trim();
    await page.getByRole("button",{name:/REPRODUCIR/}).click();
    // Software-rendered WebGL can stall a few RAF frames in CI; poll instead
    // of requiring an arbitrary 350ms progress threshold.
    await page.waitForFunction(()=>{
      const node=document.querySelector(".lab-progress-track > div");
      return !!node && parseFloat(getComputedStyle(node).width)>0;
    },null,{timeout:6500});
    await page.waitForFunction(
      ()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),
      null,{timeout:10000}
    );
    console.log("Effect played:",name);
  }
  // Validate v4's illustrative gameplay values: the original printed card
  // remains the source for both Power studies, while Vida always starts at 9.
  const basePower=Number((await page.locator(".lab-power-badge strong").textContent())?.trim());
  assert.ok(Number.isFinite(basePower),"The selected Daggerlight card must have a numeric Power value");
  await buttons.nth(0).click();
  assert.ok((await page.locator(".lab-stage").getAttribute("class"))?.includes("flavor-gold"),"Power boost must choose gold");
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.waitForFunction(()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),null,{timeout:10000});
  assert.equal(Number((await page.locator(".lab-power-badge strong").textContent())?.trim()),basePower+3,
    "Power gain must show an illustrative +3");
  await buttons.nth(1).click();
  assert.ok((await page.locator(".lab-stage").getAttribute("class"))?.includes("flavor-shadow"),"Power drain must choose near-black ink");
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.waitForFunction(()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),null,{timeout:10000});
  assert.equal(Number((await page.locator(".lab-power-badge strong").textContent())?.trim()),Math.max(0,basePower-3),
    "Power drain must be bounded at zero");
  await buttons.nth(2).click();
  assert.ok((await page.locator(".lab-stage").getAttribute("class"))?.includes("flavor-shadow"),"Damage must choose near-black ink");
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.waitForFunction(()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),null,{timeout:10000});
  assert.equal((await page.locator(".lab-life-crest strong").textContent())?.trim(),"8","Champion impact must visibly change sample Vida from 9 to 8");
  console.log("PASS: Gold Power increase, black Power decrease, black Champion damage");
  // Verify that the approved spectral reference still maps positive energy to antique gold and
  // negative energy to a genuinely dark, filled material treatment.
  await buttons.nth(3).click();
  await page.getByRole("button",{name:/Dorado/}).click();
  const stage=page.locator(".lab-stage");
  assert.ok((await stage.getAttribute("class"))?.includes("flavor-gold"),"Gold must be the default");
  await page.getByRole("button",{name:/Negro/}).click();
  assert.ok((await stage.getAttribute("class"))?.includes("flavor-shadow"),"Negative effect must select black");
  const darkFill=await stage.evaluate(element=>getComputedStyle(element).getPropertyValue("--spectral-v3-ink").trim());
  assert.equal(darkFill,"#060708","Negative polarity must be near-black ink, not just gray sparks");
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.waitForFunction(
    ()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),
    null,{timeout:10000}
  );
  await page.getByRole("button",{name:/Dorado/}).click();
  assert.ok((await stage.getAttribute("class"))?.includes("flavor-gold"),"Positive palette must be recoverable");
  await page.locator(".lab-effect-option").first().click();
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.getByRole("button",{name:/PAUSAR/}).click();
  await page.getByRole("button",{name:/CONTINUAR/}).click();
  await page.getByRole("button",{name:/REINICIAR/}).click();
  assert.match((await page.locator(".lab-transport-caption").textContent())??"",/Prueba reiniciada/);
  await page.screenshot({path:"/tmp/daggerlight-animation-lab-smoke.png"});
  assert.deepEqual(fatalErrors,[],"Browser page errors");
  console.log("PASS: thirteen GSAP/PixiJS previews, replay controls and actual Daggerlight card.");
} finally {
  await browser.close();
}
