import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port=4177;
const server=spawn(process.execPath,["./node_modules/vite/bin/vite.js","preview","--config","vite.phaser.config.ts","--host","127.0.0.1","--port",String(port),"--strictPort"],{
  stdio:["ignore","pipe","pipe"]
});
let logs="";
server.stdout.on("data",d=>logs+=String(d));
server.stderr.on("data",d=>logs+=String(d));
const errors=[];
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
async function waitReady(url){
 for(let i=0;i<40;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await delay(200);}
 throw new Error("Local preview server did not respond. "+logs);
}
try{
 await waitReady("http://127.0.0.1:"+port+"/");
 for(const [name,width,height] of [["desktop",1440,900],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const runtimeErrors=[];
  page.on("pageerror",err=>runtimeErrors.push(err.stack||err.message));
  page.on("console",msg=>{if(msg.type()==="error")runtimeErrors.push("console: "+msg.text());});
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"load",timeout:20000});
  try{
   await page.waitForFunction(()=>document.documentElement.dataset.phaserReady==="true",null,{timeout:12000});
  }catch(e){
   const status=await page.locator("#boot-status").textContent();
   throw new Error(name+" never rendered. Status: "+status+"\n"+runtimeErrors.join("\n")+"\n"+logs);
  }
  const canvas=page.locator("#game canvas");
  if(await canvas.count()!==1)throw new Error(name+" has no Phaser canvas");
  const bounds=await canvas.boundingBox();
  if(!bounds||bounds.width<width*.75||bounds.height<height*.75)throw new Error(name+" canvas has incorrect dimensions: "+JSON.stringify(bounds));
  await page.screenshot({path:"phaser-"+name+".png",fullPage:true});
  const sceneSummary=await page.evaluate(()=>({
    canvas:Array.from(document.querySelectorAll("canvas")).map(node=>[node.width,node.height]),
    ready:document.documentElement.dataset.phaserReady
  }));
  console.log("PHASER_SCENE",name,JSON.stringify(sceneSummary));
  if(runtimeErrors.some(error=>!/404|favicon|net::ERR/.test(error)))throw new Error(name+" browser errors: "+runtimeErrors.join("\n"));
  console.log("PHASER_SMOKE_OK "+name+" "+width+"x"+height+" canvas: "+Math.round(bounds.width)+"x"+Math.round(bounds.height));
  await page.close();
 }
 }finally{
  await browser.close();
  server.kill("SIGTERM");
  server.stdout.destroy();
  server.stderr.destroy();
}
