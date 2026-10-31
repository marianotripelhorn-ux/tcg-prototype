import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { positions, positionLabels } from "./data";
import type { Position } from "./types";
import "./physical-table.css";

type Seat = { name: string; life: number; archives: Record<Position,number> };
type Match = { round: number; seats: [Seat,Seat] };
const storageKey="daggerlight-physical-table-v1";
const emptySeat=(name:string):Seat=>({
  name,life:9,archives:{siniestra:0,trono:0,diestra:0}
});
const newMatch=():Match=>({round:1,seats:[emptySeat("Jugador 1"),emptySeat("Jugador 2")]});
function readInitial():Match {
  if(typeof window==="undefined")return newMatch();
  try {
    const saved=JSON.parse(window.localStorage.getItem(storageKey) || "null");
    if(!saved||!Array.isArray(saved.seats)||saved.seats.length!==2)return newMatch();
    if(!Number.isInteger(saved.round)||saved.round<1)return newMatch();
    if(!saved.seats.every((p:Seat)=>Number.isInteger(p.life)&&p.life>=0&&p.life<=9&&positions.every(pos=>Number.isInteger(p.archives?.[pos])&&p.archives[pos]>=0)))return newMatch();
    return saved as Match;
  }catch{return newMatch();}
}
export default function PhysicalTable({onBack}:{onBack:()=>void}){
  const [match,setMatch]=useState<Match>(readInitial);
  const [history,setHistory]=useState<Match[]>([]);
  const [confirmReset,setConfirmReset]=useState(false);

  useEffect(()=>{
    try { window.localStorage.setItem(storageKey,JSON.stringify(match)); }
    catch { /* The counters remain usable without local storage. */ }
  },[match]);

  function commit(update:(next:Match)=>void) {
    setMatch(old=>{
      setHistory(previous=>[...previous.slice(-49),old]);
      const next:Match=structuredClone(old);
      update(next);
      return next;
    });
    setConfirmReset(false);
  }

  function setLife(seat:0|1,delta:number) {
    if((delta<0&&match.seats[seat].life===0)||(delta>0&&match.seats[seat].life===9))return;
    commit(next=>{next.seats[seat].life=Math.max(0,Math.min(9,next.seats[seat].life+delta));});
  }
  function setArchive(seat:0|1,pos:Position,delta:number) {
    if(delta<0&&match.seats[seat].archives[pos]===0)return;
    commit(next=>{next.seats[seat].archives[pos]=Math.max(0,next.seats[seat].archives[pos]+delta);});
  }
  function rename(seat:0|1,name:string) {
    setMatch(old=>({...old,seats:old.seats.map((p,i)=>i===seat?{...p,name}:p) as [Seat,Seat]}));
  }
  function undo() {
    if(!history.length)return;
    setMatch(history.at(-1)!);
    setHistory(previous=>previous.slice(0,-1));
    setConfirmReset(false);
  }

  return (
    <main className="physical-shell">
      <header className="physical-topbar">
        <button type="button" onClick={onBack} className="physical-back">← INICIO</button>
        <span className="physical-brand">✦ DAGGERLIGHT</span>
        <ThemeToggle compact/>
      </header>
      <section className="physical-heading">
        <span>MODO MESA · PROTOTIPO</span>
        <h1>Tu partida física, bajo control.</h1>
        <p>Llevá la Vida y los Archivos de ambos jugadores. Las cartas y los duelos se resuelven sobre la mesa, como siempre.</p>
      </section>
      <div className="physical-tools">
        <div className="physical-round"><small>RONDA</small><strong>{match.round}</strong><button type="button" onClick={()=>commit(next=>{next.round+=1;})}>Siguiente ronda →</button></div>
        <button type="button" className="physical-tool-button" disabled={!history.length} onClick={undo}>↶ Deshacer</button>
        <button type="button" className="physical-tool-button" onClick={()=>setConfirmReset(true)}>Nueva partida</button>
      </div>
      {confirmReset&&<div className="physical-confirm" role="dialog" aria-label="Confirmar nueva partida">
        <p>¿Reiniciar la Vida, los Archivos y las rondas de ambos jugadores?</p>
        <button type="button" onClick={()=>setConfirmReset(false)}>Cancelar</button>
        <button type="button" onClick={()=>{commit(next=>{const blank=newMatch();next.round=blank.round;next.seats=blank.seats;});}}>Reiniciar</button>
      </div>}
      <section className="physical-seats">
        {match.seats.map((seat,index)=>{
          const side=index as 0|1;
          return <article className="physical-seat" key={side}>
            <label className="physical-name"><span>JUGADOR {index+1}</span><input aria-label={`Nombre del jugador ${index+1}`} maxLength={28} value={seat.name} onChange={e=>rename(side,e.target.value)} /></label>
            <div className="physical-life">
              <span>VIDA</span>
              <div className="physical-counter">
                <button type="button" disabled={seat.life===0} onClick={()=>setLife(side,-1)} aria-label={`Quitar 1 Vida a ${seat.name}`}>−</button>
                <strong aria-live="polite">{seat.life}</strong>
                <button type="button" disabled={seat.life===9} onClick={()=>setLife(side,1)} aria-label={`Sumar 1 Vida a ${seat.name}`}>+</button>
              </div>
              {seat.life===0&&<small>Sin Vida</small>}
            </div>
            <div className="physical-archive-heading">ARCHIVOS</div>
            <div className="physical-archives">
              {positions.map(pos=><div className="physical-archive" key={pos}>
                <span>{positionLabels[pos]}</span>
                <div className="physical-archive-controls">
                  <button type="button" disabled={seat.archives[pos]===0} onClick={()=>setArchive(side,pos,-1)} aria-label={`Quitar carta del Archivo ${positionLabels[pos]} de ${seat.name}`}>−</button>
                  <strong aria-live="polite">{seat.archives[pos]}</strong>
                  <button type="button" onClick={()=>setArchive(side,pos,1)} aria-label={`Agregar carta al Archivo ${positionLabels[pos]} de ${seat.name}`}>+</button>
                </div>
              </div>)}
            </div>
          </article>;
        })}
      </section>
      <p className="physical-help">Al terminar cada ronda, sumá al Archivo de cada posición las cartas jugadas allí. Los Archivos se conservan entre rondas. Los cambios se guardan en este dispositivo.</p>
      <footer className="physical-footer">El modo mesa no calcula Poder, no aplica habilidades ni reemplaza el reglamento físico.</footer>
    </main>
  );
}
