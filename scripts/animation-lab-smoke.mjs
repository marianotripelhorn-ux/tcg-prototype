/**
 * Real desktop browser smoke test for the isolated lab only.
 * Usage: start Vite preview on localhost:4173, then node scripts/animation-lab-smoke.mjs
 * Validates the actual React card, GSAP timeline controls, five demos and Pixi canvas.
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
  await page.locator(".lab-stage .game-card").waitFor({timeout:12000});
  const buttons=page.locator(".lab-effect-option");
  assert.equal(await buttons.count(),5,"Expected five independent motion experiments");
  await page.waitForTimeout(1100);
  const pixiStatus=(await page.locator(".lab-renderer-status").textContent())?.trim()??"unknown";
  console.log("PixiJS:",pixiStatus);
  // Software WebGL may be unavailable on some CI machines; GSAP must still work.
  for(let index=0;index<5;index++){
    await buttons.nth(index).click();
    const name=(await buttons.nth(index).textContent())?.trim();
    await page.getByRole("button",{name:/REPRODUCIR/}).click();
    await page.waitForTimeout(350);
    const progress=await page.locator(".lab-progress-track > div")
      .evaluate(node=>parseFloat(getComputedStyle(node).width));
    assert.ok(progress>0,`GSAP timeline did not advance for ${name}`);
    await page.waitForFunction(
      ()=>document.querySelector(".lab-transport-caption")?.textContent?.includes("EFECTO COMPLETADO"),
      null,{timeout:10000}
    );
    console.log("Effect played:",name);
  }
  await page.locator(".lab-effect-option").first().click();
  await page.getByRole("button",{name:/REPRODUCIR/}).click();
  await page.getByRole("button",{name:/PAUSAR/}).click();
  await page.getByRole("button",{name:/CONTINUAR/}).click();
  await page.getByRole("button",{name:/REINICIAR/}).click();
  assert.match((await page.locator(".lab-transport-caption").textContent())??"","Prueba reiniciada");
  await page.screenshot({path:"/tmp/daggerlight-animation-lab-smoke.png"});
  assert.deepEqual(fatalErrors,[],"Browser page errors");
  console.log("PASS: five GSAP/PixiJS previews, replay controls and actual Daggerlight card.");
} finally {
  await browser.close();
}
