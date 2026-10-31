/**
 * Reproducible Augurio v2 gauntlet using actual engine and AI on BOTH sides.
 * npm run gauntlet:prioresa (requires vite-node from vitest dependencies)
 */
import {mkdirSync,writeFileSync} from "node:fs";
import {chooseAIPlay,aiWantsQuiero} from "../src/engine/ai";
import {startGame,submitPlayerPlay,answerQuiero} from "../src/engine/game";
import type {AIDifficulty,DuelSummary,GameState,Side} from "../src/engine/types";
import {champions} from "../src/engine/champions";

const PRIORESS="prioresa_luna_llena";
const rivals=Object.keys(champions).filter(x=>x!==PRIORESS);
const modes:AIDifficulty[]=["normal","hard"];
const gamesPerOpponent=Number(process.env.GAUNTLET_MATCHES_PER_OPPONENT || "2000");
const outDir="reports/prioresa-augurio-v2";
if(!Number.isInteger(gamesPerOpponent)||gamesPerOpponent<4||gamesPerOpponent%4!==0) {
  throw new Error("GAUNTLET_MATCHES_PER_OPPONENT must be divisible by 4");
}
function mulberry32(seed:number):()=>number {
  return ()=>{
    let t=seed+=0x6D2B79F5;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function mirrored(s:GameState):GameState {
  return {...s,player:s.opponent,opponent:s.player,
    duelScore:{player:s.duelScore.opponent,opponent:s.duelScore.player},
    initiative:s.initiative==="player"?"opponent":"player",
    roundStarter:s.roundStarter==="player"?"opponent":"player"};
}
type Match={
  mode:AIDifficulty;rival:string;prioressSeat:Side;starter:Side;
  winner:"prioress"|"rival"|"draw";lifeDiff:number;rounds:number;duels:number;
  auguryPlayed:number;auguryHits:number;heals:number;healedAtEnd:number;
  daggerPlayed:number;daggerActivated:number;daggerAvailableAtThird:number;
  thirdDuels:number;declinedQuiero:number;acceptedQuiero:number;
};
function simulate(mode:AIDifficulty,rival:string,seat:Side,starter:Side,seed:number):Match {
  const rng=mulberry32(seed);
  const state=seat==="player"
    ?startGame(PRIORESS,rival,rng,starter,mode)
    :startGame(rival,PRIORESS,rng,starter,mode);
  const own=()=>seat==="player"?state.player:state.opponent;
  const foe=()=>seat==="player"?state.opponent:state.player;
  let duels=0,auguryPlayed=0,auguryHits=0,daggerPlayed=0,daggerActivated=0;
  let daggerAvailableAtThird=0,thirdDuels=0,declinedQuiero=0,acceptedQuiero=0;
  let steps=0;
  while(state.phase!=="finished" && steps++<600) {
    if(state.phase==="awaiting_quiero") {
      const wants=aiWantsQuiero(mirrored(state),rng);
      if(wants)acceptedQuiero++; else declinedQuiero++;
      answerQuiero(state,wants,rng);
      continue;
    }
    if(state.phase!=="awaiting_player") throw Error("Unknown phase "+state.phase);
    if(state.turn===3) {
      thirdDuels++;
      if(own().hand.some(x=>x.id==="daga_lunar"))daggerAvailableAtThird++;
    }
    const choice=chooseAIPlay(mirrored(state),
      state.initiative==="opponent"?state.pendingOpponentPlay:null,
      state.initiative==="player",rng);
    if(choice.handIndex===undefined)throw Error("AI chose no hand index");
    const last=state.lastDuel;
    submitPlayerPlay(state,choice.handIndex,choice.position,rng);
    const duel:DuelSummary|null=state.lastDuel;
    if(!duel || duel===last)throw Error("No duel resolved");
    duels++;
    const played=seat==="player"?duel.playerPlay:duel.opponentPlay;
    const against=seat==="player"?duel.opponentPlay:duel.playerPlay;
    if(played.card.effect==="augury_match3") {
      auguryPlayed++;
      if(played.position===against.position)auguryHits++;
    }
    if(played.card.id==="daga_lunar") {
      daggerPlayed++;
      if(played.notes?.some(x=>x.includes("Daga Lunar")))daggerActivated++;
    }
  }
  if(state.phase!=="finished")throw Error("Game did not finish: "+JSON.stringify({mode,rival,seat,starter,seed,duels}));
  if(own().auguryHitsTotal!==auguryHits)throw Error("Augury counter discrepancy "+auguryHits+" "+own().auguryHitsTotal);
  return {
    mode,rival,prioressSeat:seat,starter,
    winner:state.winner===seat?"prioress":state.winner==="draw"?"draw":"rival",
    lifeDiff:own().life-foe().life,rounds:state.round,
    duels,auguryPlayed,auguryHits,heals:own().auguryHeals,healedAtEnd:own().healedLife,
    daggerPlayed,daggerActivated,daggerAvailableAtThird,thirdDuels,
    declinedQuiero,acceptedQuiero
  };
}
type Stats={
  mode:AIDifficulty;rival:string;name:string;games:number;wins:number;losses:number;draws:number;
  winPct:number;winMargin95:number;meanLifeDiff:number;meanDuels:number;meanRounds:number;
  auguryPlayed:number;auguryHits:number;auguryHitPct:number;meanHeals:number;
  healedAtLeastOncePct:number;healedTwicePct:number;
  daggerPlayed:number;daggerActivated:number;daggerActivationPct:number;
  daggerAvailableAtThird:number;thirdDuels:number;
  seatWinPct:{player:number;opponent:number};
};
function statistics(mode:AIDifficulty,rival:string,g:Match[]):Stats{
  const n=g.length;
  if(!n)throw Error("No matches");
  const sum=(key:keyof Match)=>g.reduce((a,x)=>a+Number(x[key]),0);
  const wins=g.filter(x=>x.winner==="prioress").length;
  const losses=g.filter(x=>x.winner==="rival").length;
  const draws=n-wins-losses;
  const played=sum("auguryPlayed"),hits=sum("auguryHits"),dagger=sum("daggerPlayed");
  const seatRate=(seat:Side)=>{
    const a=g.filter(x=>x.prioressSeat===seat);
    return 100*a.filter(x=>x.winner==="prioress").length/a.length;
  };
  const p=wins/n;
  return {
    mode,rival,name:rival==="all"?"TODOS":champions[rival].name,
    games:n,wins,losses,draws,winPct:+(p*100).toFixed(2),
    winMargin95:+(196*Math.sqrt(p*(1-p)/n)).toFixed(2),
    meanLifeDiff:+(sum("lifeDiff")/n).toFixed(2),
    meanDuels:+(sum("duels")/n).toFixed(2),
    meanRounds:+(sum("rounds")/n).toFixed(2),
    auguryPlayed:played,auguryHits:hits,auguryHitPct:+(100*hits/played).toFixed(2),
    meanHeals:+(sum("heals")/n).toFixed(3),
    healedAtLeastOncePct:+(100*g.filter(x=>x.heals>=1).length/n).toFixed(2),
    healedTwicePct:+(100*g.filter(x=>x.heals>=2).length/n).toFixed(2),
    daggerPlayed:dagger,daggerActivated:sum("daggerActivated"),
    daggerActivationPct:dagger?+(100*sum("daggerActivated")/dagger).toFixed(2):0,
    daggerAvailableAtThird:sum("daggerAvailableAtThird"),thirdDuels:sum("thirdDuels"),
    seatWinPct:{player:+seatRate("player").toFixed(2),opponent:+seatRate("opponent").toFixed(2)}
  };
}
mkdirSync(outDir,{recursive:true});
const started=new Date().toISOString(),all:Match[]=[];
for(let mi=0;mi<modes.length;mi++) {
  for(let ri=0;ri<rivals.length;ri++) {
    const mode=modes[mi],rival=rivals[ri],batch:Match[]=[];
    for(let i=0;i<gamesPerOpponent;i++) {
      const seat:Side=i%2===0?"player":"opponent";
      const starter:Side=Math.floor(i/2)%2===0?"player":"opponent";
      const seed=(0x9E3779B9 + mi*0x101919 + ri*0x45D9F3B + (i+1)*0x27D4EB2D)>>>0;
      batch.push(simulate(mode,rival,seat,starter,seed));
    }
    all.push(...batch);
    const st=statistics(mode,rival,batch);
    console.log(mode,rival,"W",st.winPct+"%","Aug",st.auguryHitPct+"%","Heals",st.meanHeals,"Daga",st.daggerActivated+"/"+st.daggerPlayed);
  }
}
const result={
  title:"Daggerlight — Gauntlet Prioresa con Augurio v2",
  engine:"Exact TypeScript game/rules/AI; both seats played by AI",
  setup:{started,finished:new Date().toISOString(),gamesPerOpponentPerDifficulty:gamesPerOpponent,
    games:all.length,champion:PRIORESS,rivals,modes,balancedSeats:true,balancedInitialStarter:true,
    seed:"mulberry32 with matchup and game indices",
    notes:["Same AI difficulty on both seats; challenger can appear in either seat.",
      "Both seats choose cards with chooseAIPlay; Quiero uses aiWantsQuiero.",
      "Augurio hit counts even when the duel is lost.","Daga activation requires an actual card play in the third duel.",
      "95% confidence intervals are approximate binomial intervals."]},
  overall:modes.map(mode=>statistics(mode,"all",all.filter(x=>x.mode===mode))),
  matchups:modes.flatMap(mode=>rivals.map(rival=>statistics(mode,rival,all.filter(x=>x.mode===mode&&x.rival===rival))))
};
const cols=Object.keys(all[0]) as (keyof Match)[];
const lines=[cols.join(",")].concat(all.map(x=>cols.map(k=>String(x[k])).join(",")));
writeFileSync(outDir+"/matches.csv",lines.join("\n")+"\n");
writeFileSync(outDir+"/summary.json",JSON.stringify(result,null,2));
const row=(x:Stats)=>"| "+x.name+" | "+x.games+" | "+x.winPct+"% | ±"+x.winMargin95+" pp | "+x.auguryHitPct+"% | "+x.meanHeals+" | "+x.daggerActivated+"/"+x.daggerPlayed+" |";
const table=(list:Stats[])=>["| Rival | Partidas | Victorias | Margen 95% | Aciertos Augurio | Curaciones/partida | Daga activa/jugada |",
  "|---|---:|---:|---:|---:|---:|---:|"].concat(list.map(row)).join("\n");
const md=["# Gauntlet: Prioresa con Augurio v2","",
  "Partidas simuladas con el motor TypeScript real, IA vs IA en ambos asientos, inicio y asientos equilibrados.",
  "## Totales","",table(result.overall),""];
for(const mode of modes)md.push("## Dificultad "+mode.toUpperCase(),"",table(result.matchups.filter(x=>x.mode===mode)),"");
md.push("La tasa de acierto incluye cartas que pierden el duelo. Daga activa/jugada requiere que la carta se haya utilizado y cumpliera su condición.",
  "El margen 95% es una aproximación estadística, no una evaluación de experiencia humana.",
  "Generado: "+result.setup.finished+".","");
writeFileSync(outDir+"/summary.md",md.join("\n"));
console.log("COMPLETED",all.length,"matches",outDir);
