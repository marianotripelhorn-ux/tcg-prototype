import {useMemo,useState} from "react";
import {allCards,factionLabels} from "./data";
import {champions} from "./engine/champions";
import {championShortName} from "./championArtwork";
import {proposedMultifactionRules,validateDeck} from "./engine/decks";
import type {DeckDefinition} from "./engine/decks";
import type {AIDifficulty} from "./engine/types";
import type {Faction} from "./types";
import ThemeToggle from "./ThemeToggle";
import "./deck-lab.css";

const factions: Faction[]=["red","blue","white","saints","ivory"];
const championIds=Object.keys(champions);

export default function DeckLab({onBack,onPlay}:{
  onBack:()=>void;
  onPlay:(deck:DeckDefinition,opponentId:string,difficulty:AIDifficulty)=>void;
}) {
  const [championId,setChampionId]=useState("dextral");
  const [secondary,setSecondary]=useState<Faction|null>(null);
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [rival,setRival]=useState("random");
  const [difficulty,setDifficulty]=useState<AIDifficulty>("normal");
  const champion=champions[championId];
  const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
  const distinct=Object.keys(counts).length;
  const {deckSize,maxCopies,distinctCards}=proposedMultifactionRules;
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
    setCounts({});
    setSecondary(null);
  }
  function changeSecondary(id:string){
    const next=(id||null) as Faction|null;
    setSecondary(next);
    // A new faction pairing always begins with an empty deck.
    setCounts({});
  }
  function changeCard(id:string,selected:boolean) {
    setCounts(old=>{
      const alreadySelected=Boolean(old[id]);
      if(selected===alreadySelected)return old;
      if(selected && Object.keys(old).length>=distinctCards)return old;
      const next={...old};
      if(selected)next[id]=maxCopies;
      else delete next[id];
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
        <p>24 CARTAS · HASTA 2 FACCIONES · 12 CARTAS DIFERENTES.</p>
      </section>
      <section className="deck-lab-config" aria-label="Configuración del mazo">
        <label>CAMPEÓN
          <select value={championId} onChange={e=>changeChampion(e.target.value)}>
            {championIds.map(id=><option key={id} value={id}>{championShortName(champions[id].name)}</option>)}
          </select>
        </label>
        <label>SEGUNDA FACCIÓN
          <select value={secondary??""} onChange={e=>changeSecondary(e.target.value)}>
            <option value="">Solo {factionLabels[champion.faction]}</option>
            {factions.filter(f=>f!==champion.faction).map(f=><option value={f} key={f}>{factionLabels[f]}</option>)}
          </select>
        </label>
        <div className="deck-lab-count">
          <span>SELECCIONADAS</span>
          <strong className={distinct===distinctCards?"complete":""}>{distinct} / {distinctCards}</strong>
          <small>{total} / {deckSize} cartas</small>
        </div>
      </section>
      <section className="deck-lab-grid" aria-label="Cartas para construir el mazo">
        {pool.map(card=>{
          const count=counts[card.id]??0;
          return <article className={"deck-lab-card theme-"+card.faction+(count?" is-selected":"")} key={card.id}>
            <div className="deck-lab-card-head">
              <span>{card.studioId}</span>
              <strong>{card.power} PODER</strong>
            </div>
            <h2>{card.name}</h2>
            <p>{card.text}</p>
            <div className="deck-lab-card-controls">
              <button type="button" disabled={!count} onClick={()=>changeCard(card.id,false)} aria-label={"Quitar las 2 copias de "+card.name}>−</button>
              <span aria-label={count+" de "+maxCopies+" copias"}>{count} / {maxCopies}</span>
              <button type="button" disabled={Boolean(count)||distinct>=distinctCards} onClick={()=>changeCard(card.id,true)} aria-label={"Agregar 2 copias de "+card.name}>+</button>
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
            {championIds.map(id=><option key={id} value={id}>{championShortName(champions[id].name)}</option>)}
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
