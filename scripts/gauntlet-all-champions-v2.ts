/**
 * Daggerlight complete champion round-robin (9 champions = 36 unordered pairs).
 * Run with: ./node_modules/.bin/vite-node scripts/gauntlet-all-champions-v2.ts
 * Actual game engine and AI on both seats. Fixed deterministic seeds.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chooseAIPlay, aiWantsQuiero } from "../src/engine/ai";
import { startGame, submitPlayerPlay, answerQuiero } from "../src/engine/game";
import { champions } from "../src/engine/champions";
import type { GameState, Side, AIDifficulty } from "../src/engine/types";

const IDs = Object.keys(champions);
const MODES:AIDifficulty[]=["normal","hard"];
const PAIR_MATCHES=Number(process.env.PAIR_MATCHES || "2000");
if(!Number.isInteger(PAIR_MATCHES)||PAIR_MATCHES<4||PAIR_MATCHES%4!==0) {
  throw new Error("PAIR_MATCHES must be divisible by 4 and >= 4");
}
const PAIRS=IDs.flatMap((a,i)=>IDs.slice(i+1).map(b=>[a,b] as const));
const OUTPUT="reports/all-champions-augurio-v2";

function seeded(seed:number) {
  return ()=>{
    let t=seed+=0x6D2B79F5;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function viewForPlayer(state:GameState):GameState {
  return {
    ...state,player:state.opponent,opponent:state.player,
    duelScore:{player:state.duelScore.opponent,opponent:state.duelScore.player},
    initiative:state.initiative==="player"?"opponent":"player",
    roundStarter:state.roundStarter==="player"?"opponent":"player"
  };
}

type Match={
  mode:AIDifficulty;a:string;b:string;aSeat:Side;starter:Side;
  winner:"a"|"b"|"draw";lifeA:number;lifeB:number;
  duels:number;rounds:number;
  aAuguryHits:number;bAuguryHits:number;aHeals:number;bHeals:number;
};

function simulate(mode:AIDifficulty,a:string,b:string,aSeat:Side,starter:Side,seed:number):Match {
  const rng=seeded(seed);
  const s=aSeat==="player"?startGame(a,b,rng,starter,mode):startGame(b,a,rng,starter,mode);
  let duels=0;
  let steps=0;
  while(s.phase!=="finished"&&steps++<600){
    if(s.phase==="awaiting_quiero"){
      // The native game engine asks the UI player whether to continue.
      // Mirror seats so the same AI policy makes that decision.
      answerQuiero(s,aiWantsQuiero(viewForPlayer(s),rng),rng);
      continue;
    }
    if(s.phase!=="awaiting_player")throw Error("Unexpected phase "+s.phase);
    const choice=chooseAIPlay(
      viewForPlayer(s),
      s.initiative==="opponent"?s.pendingOpponentPlay:null,
      s.initiative==="player",
      rng
    );
    if(choice.handIndex===undefined)throw Error("Missing AI hand index");
    const prev=s.lastDuel;
    submitPlayerPlay(s,choice.handIndex,choice.position,rng);
    if(!s.lastDuel||prev===s.lastDuel)throw Error("A duel was not resolved");
    duels++;
  }
  if(s.phase!=="finished")throw Error("Max steps exceeded "+JSON.stringify({mode,a,b,aSeat,starter,seed,duels}));
  const pA=aSeat==="player"?s.player:s.opponent;
  const pB=aSeat==="player"?s.opponent:s.player;
  return {
    mode,a,b,aSeat,starter,winner:s.winner==="draw"?"draw":s.winner===aSeat?"a":"b",
    lifeA:pA.life,lifeB:pB.life,duels,rounds:s.round,
    aAuguryHits:pA.auguryHitsTotal,bAuguryHits:pB.auguryHitsTotal,
    aHeals:pA.auguryHeals,bHeals:pB.auguryHeals
  };
}

type Pair={
  mode:AIDifficulty;a:string;b:string;factionA:string;factionB:string;
  games:number;winsA:number;winsB:number;draws:number;
  rateA:number;rateB:number;margin95:number;
  lifeDiff:number;duels:number;rounds:number;
  aAsPlayerWin:number;aAsOpponentWin:number;
};
function onePair(mode:AIDifficulty,a:string,b:string,matches:Match[]):Pair {
  const n=matches.length,wA=matches.filter(m=>m.winner==="a").length,wB=matches.filter(m=>m.winner==="b").length;
  const seatRate=(seat:Side)=>{
    const sub=matches.filter(m=>m.aSeat===seat);
    return sub.filter(m=>m.winner==="a").length*100/sub.length;
  };
  const p=wA/n;
  const round=(n:number,digits=2)=>+n.toFixed(digits);
  return {
    mode,a,b,factionA:champions[a].faction,factionB:champions[b].faction,
    games:n,winsA:wA,winsB:wB,draws:n-wA-wB,
    rateA:round(wA*100/n),rateB:round(wB*100/n),
    margin95:round(196*Math.sqrt(p*(1-p)/n)),
    lifeDiff:round(matches.reduce((sum,m)=>sum+m.lifeA-m.lifeB,0)/n),
    duels:round(matches.reduce((sum,m)=>sum+m.duels,0)/n),
    rounds:round(matches.reduce((sum,m)=>sum+m.rounds,0)/n),
    aAsPlayerWin:round(seatRate("player")),aAsOpponentWin:round(seatRate("opponent"))
  };
}

type ChampionStats={
  id:string;name:string;faction:string;difficulty:AIDifficulty;
  games:number;wins:number;losses:number;draws:number;
  winRate:number;margin95:number;meanRemainingLifeDiff:number;
  asFirstSeatRate:number;asSecondSeatRate:number;
  bestMatchup:string;bestRate:number;worstMatchup:string;worstRate:number;
};
function championStats(mode:AIDifficulty,pairs:Pair[]):ChampionStats[] {
  return IDs.map(id=>{
    const relevant=pairs.filter(p=>p.a===id||p.b===id);
    const games=relevant.reduce((s,p)=>s+p.games,0);
    const wins=relevant.reduce((s,p)=>s+(p.a===id?p.winsA:p.winsB),0);
    const draws=relevant.reduce((s,p)=>s+p.draws,0),p=wins/games;
    const opponents=relevant.map(q=>({id:q.a===id?q.b:q.a,rate:q.a===id?q.rateA:q.rateB}));
    opponents.sort((a,b)=>b.rate-a.rate);
    return {
      id,name:champions[id].name,faction:champions[id].faction,difficulty:mode,
      games,wins,losses:games-wins-draws,draws,
      winRate:+(100*p).toFixed(2),margin95:+(196*Math.sqrt(p*(1-p)/games)).toFixed(2),
      meanRemainingLifeDiff:+(relevant.reduce((s,q)=>s+(q.a===id?q.lifeDiff:-q.lifeDiff)*q.games,0)/games).toFixed(2),
      asFirstSeatRate:+(relevant.reduce((s,q)=>s+(q.a===id?q.aAsPlayerWin:100-q.aAsPlayerWin)*q.games,0)/games).toFixed(2),
      asSecondSeatRate:+(relevant.reduce((s,q)=>s+(q.a===id?q.aAsOpponentWin:100-q.aAsOpponentWin)*q.games,0)/games).toFixed(2),
      bestMatchup:opponents[0].id,bestRate:opponents[0].rate,
      worstMatchup:opponents.at(-1)!.id,worstRate:opponents.at(-1)!.rate
    };
  }).sort((a,b)=>b.winRate-a.winRate);
}

const results:Pair[]=[];
const started=new Date().toISOString();
for(let di=0;di<MODES.length;di++){
  const mode=MODES[di];
  for(let pi=0;pi<PAIRS.length;pi++){
    const [a,b]=PAIRS[pi],batch:Match[]=[];
    for(let i=0;i<PAIR_MATCHES;i++){
      const aSeat:Side=i%2===0?"player":"opponent";
      const starter:Side=Math.floor(i/2)%2===0?"player":"opponent";
      const seed=(0x513F42B9+di*0x12a3f+pi*0x4b983+(i+1)*0x3c6ef35f)>>>0;
      batch.push(simulate(mode,a,b,aSeat,starter,seed));
    }
    const data=onePair(mode,a,b,batch);
    if(data.winsA+data.winsB+data.draws!==data.games)throw Error("Win accounting mismatch");
    results.push(data);
    console.log(mode.padEnd(6),a.padEnd(21),b.padEnd(21),
      data.rateA.toFixed(2)+"% / "+data.rateB.toFixed(2)+"%",
      "n="+data.games);
  }
}
const byChampion=MODES.flatMap(mode=>championStats(mode,results.filter(x=>x.mode===mode)));
const factions=["red","blue","white","saints","ivory"];
const factionStats=MODES.flatMap(mode=>factions.map(faction=>{
  const rows=byChampion.filter(r=>r.difficulty===mode&&r.faction===faction);
  const wins=rows.reduce((s,c)=>s+c.wins,0),games=rows.reduce((s,c)=>s+c.games,0);
  return {mode,faction,champions:rows.length,games,wins,winRate:+(wins/games*100).toFixed(2)};
}));
function matrix(mode:AIDifficulty) {
  const lookup=results.filter(x=>x.mode===mode);
  return IDs.map(a=>({
    champion:a,
    ...Object.fromEntries(IDs.map(b=>{
      if(a===b)return [b,null];
      const pair=lookup.find(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
      if(!pair)throw Error("Missing pair "+a+"/"+b);
      return [b,pair.a===a?pair.rateA:pair.rateB];
    }))
  }));
}
const output={
  title:"Daggerlight — Gauntlet de los nueve Champions con Augurio v2",
  setup:{
    started,finished:new Date().toISOString(),
    champions:IDs.length,uniquePairs:PAIRS.length,difficulties:MODES,
    matchesPerPairPerDifficulty:PAIR_MATCHES,
    totalMatches:results.reduce((s,x)=>s+x.games,0),
    deterministicSeeds:true,balancedStarter:true,balancedSeat:true,
    usingRealEngine:true,usingRealAI:true,
    notes:[
      "All nine Champions crossed once per unique pair, both AI agents at same difficulty.",
      "The built-in engine automates the opponent; a mirrored game state is passed to chooseAIPlay for the UI player.",
      "Quiero/No quiero uses the engine policy and can terminate a round after two duels.",
      "Faction win percentages reflect two Champions per faction except Priorato, with just one.",
      "Pair confidence margins approximate a binomial 95% interval. Mirrored seeds are not independent human playtests.",
      "Does not include same-Champion mirror matches or cross-difficulty pairings."
    ]
  },champions:byChampion,factions:factionStats,pairs:results,
  matrices:Object.fromEntries(MODES.map(mode=>[mode,matrix(mode)]))
};
mkdirSync(OUTPUT,{recursive:true});
writeFileSync(OUTPUT+"/results.json",JSON.stringify(output,null,2));
const header=[
  "mode","a","b","factionA","factionB","games","winsA","winsB","draws",
  "rateA","rateB","margin95","lifeDiff","duels","rounds","aAsPlayerWin","aAsOpponentWin"
];
const csv=[header.join(",")].concat(results.map(r=>header.map(k=>String(r[k as keyof Pair])).join(",")));
writeFileSync(OUTPUT+"/matchups.csv",csv.join("\n")+"\n");
const labels:Record<string,string>={red:"Guardia Dextral",blue:"Corte Sinistral",white:"Empíreos",saints:"Santos",ivory:"Priorato de Marfil"};
const pct=(x:number)=>x.toFixed(2)+"%";
const lines=[
  "# Gauntlet integral — Daggerlight con Augurio v2",
  "",
  "**Motor real y IA real**: nueve Champions, "+PAIRS.length+" enfrentamientos únicos, dos dificultades, "+
    PAIR_MATCHES+" partidas por enfrentamiento y dificultad. **"+output.setup.totalMatches+" partidas en total.**",
  "Asientos e iniciativa inicial equilibrados. Resultados reproducibles mediante semillas fijas.",
  ""
];
for(const mode of MODES){
  lines.push("## IA "+mode.toUpperCase(),"");
  lines.push("| # | Champion | Facción | Partidas | Victoria | Margen aprox. 95% | Diferencia Vida |",
  "|---:|---|---|---:|---:|---:|---:|");
  byChampion.filter(x=>x.difficulty===mode).forEach((x,i)=>{
    lines.push("| "+(i+1)+" | "+x.name+" | "+labels[x.faction]+" | "+x.games+" | "+pct(x.winRate)+
      " | ±"+x.margin95+" pp | "+x.meanRemainingLifeDiff+" |");
  });
  lines.push("","### Facciones","",
    "| Facción | Champions | Partidas acumuladas | Tasa de victoria |",
    "|---|---:|---:|---:|");
  for(const x of factionStats.filter(x=>x.mode===mode)) {
    lines.push("| "+labels[x.faction]+" | "+x.champions+" | "+x.games+" | "+pct(x.winRate)+" |");
  }
  lines.push("","### Matriz de enfrentamientos","");
  lines.push("Fila = Champion analizado; columna = rival. Cada celda muestra % de victoria de la fila. Diagonal sin partidas.");
  lines.push("| Champion | "+IDs.map(id=>champions[id].name).join(" | ")+" |");
  lines.push("|---|"+IDs.map(()=>"---:").join("|")+"|");
  for(const row of matrix(mode))lines.push("| "+champions[row.champion].name+" | "+
    IDs.map(id=>row[id]===null?"—":pct(Number(row[id]))).join(" | ")+" |");
  lines.push("");
}
lines.push("## Interpretación y límites",
  "- Las tasas por Champion se calculan sobre los otros ocho Champions con igual cantidad de partidas por rival. Los datos por facción agregan las partidas de sus Champions.",
  "- Con esta estructura, una facción puede tener un Champion muy fuerte y otro muy débil. Por eso no debe balancearse solo con la media por facción.",
  "- La IA Difícil no es necesariamente más fuerte en todos los enfrentamientos; hay que comparar con cuidado los resultados entre dificultades.",
  "- Se incluyen las reglas experimentales Augurio v2, Daga Lunar y las curaciones acumuladas de la Prioresa.",
  "- No se han modificado valores de Poder, habilidades, ni decisiones de IA durante este experimento.",
  "- El gauntlet mide IA vs IA y no sustituye partidas humanas ni pruebas físicas.",
  "","Generado: "+output.setup.finished,"");
writeFileSync(OUTPUT+"/summary.md",lines.join("\n"));
console.log("GAUNTLET FINISHED",output.setup.totalMatches,"matches",OUTPUT);
