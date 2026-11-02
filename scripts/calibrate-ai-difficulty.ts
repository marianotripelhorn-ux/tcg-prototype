import {mkdirSync,writeFileSync} from "node:fs";
import {champions} from "../src/engine/champions";
import {chooseAIPlay,aiWantsQuiero} from "../src/engine/ai";
import {answerQuiero,startGame,submitPlayerPlay} from "../src/engine/game";
import type {AIDifficulty,GameState,Side} from "../src/engine/types";

const comparisons:[AIDifficulty,AIDifficulty][]=[
 ["normal","easy"],["hard","normal"],["hard","easy"]
];
const n=Number(process.env.DIFFICULTY_MATCHES_PER_CHAMPION ?? "400");
const ids=Object.keys(champions);
if(!Number.isInteger(n)||n<4||n%4!==0)throw Error("Matches must be divisible by four");

function rngOf(seed:number) {
 return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
function playerAI(s:GameState,mode:AIDifficulty):GameState{
 return {...s,aiDifficulty:mode,player:s.opponent,opponent:s.player,
 duelScore:{player:s.duelScore.opponent,opponent:s.duelScore.player},
 initiative:s.initiative==="player"?"opponent":"player",
 roundStarter:s.roundStarter==="player"?"opponent":"player"};
}
interface Result{
 championId:string;strong:AIDifficulty;weak:AIDifficulty;
 winner:"strong"|"weak"|"draw";strongSeat:Side;
}
const results:Result[]=[];
for(let p=0;p<comparisons.length;p++){
 const [strong,weak]=comparisons[p];
 for(let c=0;c<ids.length;c++){
  const id=ids[c];let wins=0;
  for(let i=0;i<n;i++){
   const strongSeat:Side=i%2===0?"player":"opponent";
   const starter:Side=Math.floor(i/2)%2===0?"player":"opponent";
   const rng=rngOf((0x37a1c1e+p*0x26db+c*0x378eb+i*0x68e31)>>>0);
   const s=startGame(id,id,rng,starter,strongSeat==="opponent"?strong:weak);
   let steps=0;
   while(s.phase!=="finished"&&steps++<550){
    const playerMode=strongSeat==="player"?strong:weak;
    if(s.phase==="awaiting_quiero"){
     answerQuiero(s,aiWantsQuiero(playerAI(s,playerMode),rng),rng);
     continue;
    }
    if(s.phase!=="awaiting_player")throw Error("Invalid phase");
    const choice=chooseAIPlay(playerAI(s,playerMode),
     s.initiative==="opponent"?s.pendingOpponentPlay:null,s.initiative==="player",rng);
    submitPlayerPlay(s,choice.handIndex!,choice.position,rng);
   }
   if(s.phase!=="finished")throw Error("Game stuck: "+id);
   const winner=s.winner==="draw"?"draw":s.winner===strongSeat?"strong":"weak";
   if(winner==="strong")wins++;
   results.push({championId:id,strong,weak,winner,strongSeat});
  }
  console.log(strong+" vs "+weak,id,"win rate",+(wins*100/n).toFixed(2));
 }
}
const summary=comparisons.map(([strong,weak])=>{
 const rows=results.filter(r=>r.strong===strong&&r.weak===weak);
 const wins=rows.filter(r=>r.winner==="strong").length;
 const losses=rows.filter(r=>r.winner==="weak").length;
 const draws=rows.length-wins-losses;
 const p=wins/rows.length;
 return {strong,weak,games:rows.length,wins,losses,draws,
 winPct:+(100*p).toFixed(2),approxMargin95:+(196*Math.sqrt(p*(1-p)/rows.length)).toFixed(2),
 champions:ids.map(id=>{
  const r=rows.filter(x=>x.championId===id);
  return {id,name:champions[id].name,games:r.length,strongWins:r.filter(x=>x.winner==="strong").length,
   strongWinPct:+(100*r.filter(x=>x.winner==="strong").length/r.length).toFixed(2)};
 })};
});
const dir="reports/ai-difficulty-calibration-v1";
mkdirSync(dir,{recursive:true});
writeFileSync(dir+"/results.json",JSON.stringify({games:results.length,comparisons:summary},null,2));
const content=[
 "# Calibración de dificultades IA — Daggerlight",
 "",
 "Se compararon las IA en partidas espejo del mismo Champion y mazo, para evitar diferencias del balance de facciones.",
 "",
 "| Enfrentamiento | Partidas | Victoria IA superior | Margen aprox. 95% |",
 "|---|---:|---:|---:|",
 ...summary.map(x=>"| "+x.strong+" vs "+x.weak+" | "+x.games+" | "+x.winPct+"% | ±"+x.approxMargin95+" pp |"),
 "",
 "## Desglose por Champion",
 "",
 "| Champion | Normal vs Fácil | Difícil vs Normal | Difícil vs Fácil |",
 "|---|---:|---:|---:|",
 ...ids.map(id=>"| "+champions[id].name+" | "+summary.map(x=>x.champions.find(c=>c.id===id)!.strongWinPct+"%").join(" | ")+" |"),
 "",
 "Las tasas describen partidas IA vs IA. Una dificultad superior debería superar el 50% frente a la inferior en una comparación justa.",
 "No se modifica la IA durante la medición. Se mantiene el balance actual.",
 ""
];
writeFileSync(dir+"/summary.md",content.join("\n"));
console.log("FINISHED",results.length);
