import {useMemo,useState} from "react";
import {allCards,factionLabels} from "./data";
import {champions} from "./engine/champions";
import {makeMonoDeckDefinition,validateDeck} from "./engine/decks";
import type {DeckDefinition} from "./engine/decks";
import type {AIDifficulty} from "./engine/types";
import type {Faction} from "./types";
import ThemeToggle from "./ThemeToggle";
import "./deck-lab.css";

const factions: Faction[]=["red","blue","white","saints","ivory"];
const championIds=Object.keys(champions);
const countCards=(ids:string[])=>ids.reduce<Record<string,number>>((a,id)=>({...a,[id]:(a[id]??0)+1}),{});

export default function DeckLab({onBack,onPlay}:{
  onBack:()=>void;
  onPlay:(deck:DeckDefinition,opponentId:string,difficulty:AIDifficulty)=>void;
}) {
  const [championId,setChampionId]=useState("dextral");
  const [secondary,setSecondary]=useState<Faction|null>(null);
  const [counts,setCounts]=useState<Record<string,number>>(()=>countCards(makeMonoDeckDefinition("dextral").cardIds));
  const [rival,setRival]=useState("random");
  const [difficulty,setDifficulty]=useState<AIDifficulty>("normal");
  const champion=champions[championId];
  const total=Object.values(counts).reduce((s,n)=>s+n,0);
  const definition:DeckDefinition=useMemo(()=>({
    id:"multifaction-draft-"+championId,
    name:"Mazo experimental · "+champion.name,
    championId,
    cardIds:allCards.flatMap(card=>Array.from({length:counts[card.id]??0},()=>card.id))
  }),[championId,champion.name,counts]);
  const validation=validateDeck(definition);
  const pool=allCards.filter(card=>card.faction===champion.faction||card.faction===secondary);

  function changeChampion(id:string){
    setChampionId(id);
    setCounts(countCards(makeMonoDeckDefinition(id).cardIds));
    setSecondary(null);
  }
  function changeSecondary(id:string){
    const next=(id||null) as Faction|null;
    setSecondary(next);
    setCounts(current=>Object.fromEntries(Object.entries(current).filter(([cardId])=>{
      const card=allCards.find(c=>c.id===cardId);
      return card && (card.faction===champions[championId].faction||card.faction===next);
    })));
  }
  function changeCard(id:string,delta:1|-1) {
    setCounts(old=>{
      const current=old[id]??0;
      if(delta===1 && (current>=2||total>=24))return old;
      if(delta===-1 && current===0)return old;
      const next={...old,[id]:current+delta};
      if(next[id]===0)delete next[id];
      return next;
    });
  }

  return (
    <main className="deck-lab-screen">
      <header className="deck-lab-top">
        <button type="button" className="deck-lab-back" onClick={onBack}>← INICIO</button>
        <strong>DAGGERLIGHT · LABORATORIO DE MAZOS</strong>
        <ThemeToggle compact/>
      </header>
      <section className="deck-lab-intro">
        <span>PRUEBAS DE CONSTRUCCIÓN · REGLAS PROVISIONALES</span>
        <h1>Explorá nuevas alianzas.</h1>
        <p>Combiná cartas de hasta dos facciones bajo un solo Champion. El formato de prueba utiliza 24 cartas y hasta dos copias de cada una. No modifica los mazos originales ni establece todavía las reglas definitivas.</p>
      </section>
      <section className="deck-lab-config" aria-label="Configuración del mazo">
        <label>CHAMPION
          <select value={championId} onChange={e=>changeChampion(e.target.value)}>
            {championIds.map(id=><option key={id} value={id}>{champions[id].name}</option>)}
          </select>
        </label>
        <label>SEGUNDA FACCIÓN
          <select value={secondary??""} onChange={e=>changeSecondary(e.target.value)}>
            <option value="">Solo {factionLabels[champion.faction]}</option>
            {factions.filter(f=>f!==champion.faction).map(f=><option value={f} key={f}>{factionLabels[f]}</option>)}
          </select>
        </label>
        <div className="deck-lab-count">
          <span>CARTAS</span>
          <strong className={total===24?"complete":""}>{total} / 24</strong>
        </div>
      </section>
      <section className="deck-lab-grid" aria-label="Cartas para construir el mazo">
        {pool.map(card=>{
          const count=counts[card.id]??0;
          return <article className={"deck-lab-card theme-"+card.faction} key={card.id}>
            <div className="deck-lab-card-head">
              <span>{card.studioId}</span>
              <strong>{card.power} PODER</strong>
            </div>
            <h2>{card.name}</h2>
            <p>{card.text}</p>
            <div className="deck-lab-card-controls">
              <button type="button" disabled={!count} onClick={()=>changeCard(card.id,-1)} aria-label={"Quitar copia de "+card.name}>−</button>
              <span aria-label={count+" copias"}>{count} / 2</span>
              <button type="button" disabled={count>=2||total>=24} onClick={()=>changeCard(card.id,1)} aria-label={"Agregar copia de "+card.name}>+</button>
            </div>
          </article>;
        })}
      </section>
      <section className="deck-lab-bottom">
        <div className="deck-lab-validation" aria-live="polite">
          <strong>{validation.valid?"Mazo válido para pruebas":"Completá tu mazo para jugar"}</strong>
          <p>{validation.valid
            ?"Este mazo experimental se puede jugar contra la IA."
            :validation.errors.join(" · ")}</p>
        </div>
        <label>RIVAL
          <select value={rival} onChange={e=>setRival(e.target.value)}>
            <option value="random">Aleatorio</option>
            {championIds.map(id=><option key={id} value={id}>{champions[id].name}</option>)}
          </select>
        </label>
        <label>IA
          <select value={difficulty} onChange={e=>setDifficulty(e.target.value as AIDifficulty)}>
            <option value="easy">Fácil</option>
            <option value="normal">Normal</option>
            <option value="hard">Difícil</option>
          </select>
        </label>
        <button type="button" className="deck-lab-play" disabled={!validation.valid} onClick={()=>onPlay(definition,rival,difficulty)}>PROBAR MAZO →</button>
      </section>
    </main>
  );
}
