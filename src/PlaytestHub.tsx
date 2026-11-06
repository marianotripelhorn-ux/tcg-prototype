import { useState } from "react";
import { champions } from "./engine/champions";
import { championShortName } from "./championArtwork";
import { downloadPlaytest, playtestCsv, readPlaytests, saveFeedback, type Feedback } from "./playtestStorage";
import ThemeToggle from "./ThemeToggle";

export default function PlaytestHub({onBack}:{onBack:()=>void}) {
  const [records,setRecords]=useState(()=>readPlaytests());
  const [selected,setSelected]=useState(records.at(-1)?.id||"");
  const [diversion,setDiversion]=useState(4);
  const [claridad,setClaridad]=useState(4);
  const [comentario,setComentario]=useState("");
  const active=records.find(r=>r.id===selected);
  const count=records.length;
  const wins=records.filter(r=>r.result==="win").length;
  const renew=()=>setRecords(readPlaytests());
  function submit(){
    if(!active)return;
    const feedback:Feedback={diversion,claridad,comentario:comentario.trim().slice(0,500)};
    saveFeedback(active.id,feedback);renew();
  }
  return <main className="fo-shell playtest-screen">
    <header className="fo-topbar">
      <button className="fo-back" onClick={onBack}>← INICIO</button>
      <span className="fo-wordmark">DAGGERLIGHT</span>
      <ThemeToggle/>
    </header>
    <section className="playtest-inner">
      <h1>PLAYTEST</h1>
      <p className="playtest-subtitle">HISTORIAL Y OBSERVACIONES</p>
      <div className="playtest-stats">
        <strong>{count}<span>PARTIDAS</span></strong>
        <strong>{wins}<span>VICTORIAS</span></strong>
        <strong>{records.filter(r=>r.mode==="PVP").length}<span>PVP</span></strong>
      </div>
      <div className="playtest-actions">
        <button onClick={()=>downloadPlaytest("daggerlight-playtest.json",JSON.stringify(records,null,2))}>EXPORTAR JSON</button>
        <button onClick={()=>downloadPlaytest("daggerlight-playtest.csv",playtestCsv(records),"text/csv;charset=utf-8")}>EXPORTAR CSV</button>
      </div>
      {count===0 ? <div className="playtest-empty">Todavía no hay partidas registradas. Terminá una partida para empezar.</div> :
      <div className="playtest-layout">
        <div className="playtest-list">
          {[...records].reverse().map(r=><button key={r.id} className={selected===r.id?"is-selected":""}
            onClick={()=>{setSelected(r.id);setDiversion(r.feedback?.diversion??4);setClaridad(r.feedback?.claridad??4);setComentario(r.feedback?.comentario??"");}}>
            <span>{r.mode} · {new Date(r.at).toLocaleDateString("es-AR")}</span>
            <strong>{championShortName(champions[r.championId]?.name||r.championId).toUpperCase()} VS. {championShortName(champions[r.rivalId]?.name||r.rivalId).toUpperCase()}</strong>
            <span>{r.result==="win"?"VICTORIA":r.result==="loss"?"DERROTA":"EMPATE"} · {r.duels} DUELOS</span>
          </button>)}
        </div>
        {active&&<section className="playtest-detail">
          <h2>¿CÓMO FUE LA PARTIDA?</h2>
          <div className="playtest-ratings">
            <label>DIVERSIÓN <select value={diversion} onChange={e=>setDiversion(+e.target.value)}>
              {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}
            </select></label>
            <label>CLARIDAD <select value={claridad} onChange={e=>setClaridad(+e.target.value)}>
              {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}
            </select></label>
          </div>
          <label>¿QUÉ CAMBIARÍAS?
            <textarea maxLength={500} rows={3} value={comentario} onChange={e=>setComentario(e.target.value)} placeholder="Cartas confusas, decisiones interesantes, problemas…"/>
          </label>
          <button className="playtest-save" onClick={submit}>GUARDAR FEEDBACK</button>
          <h3>REGISTRO DE ACCIONES</h3>
          <div className="playtest-log">{active.actions.map((e,i)=><p key={i}><span>{e.kind.toUpperCase()}</span> {e.text}</p>)}</div>
        </section>}
      </div>}
      <p className="playtest-privacy">Los registros quedan únicamente en este navegador. Exportá el JSON o CSV para compartirlos con el diseñador. El análisis remoto es opcional.</p>
    </section>
  </main>;
}
