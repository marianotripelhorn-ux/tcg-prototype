import { useEffect, useMemo, useRef, useState } from "react";
import { positions,positionLabels } from "./data";
import { champions } from "./engine/champions";
import { legalPositions } from "./engine/rules";
import { SPECIAL_NAME,SPECIAL_TEXT,copyTargets } from "./engine/manifestations";
import type { GameState, EnginePlay, SpecialKind } from "./engine/types";
import { ManifestCard, ManifestCardDialog } from "./ManifestCard";
import type { CardDefinition,Position } from "./types";
import { cardSpriteBackground } from "./cardArtwork";
import { championImageUrl,championShortName } from "./championArtwork";
import { downloadPlaytest, saveFeedback, saveHumanMatch } from "./playtestStorage";
import ThemeToggle from "./ThemeToggle";

const ENDPOINT=(import.meta.env.VITE_PVP_API_URL||"").trim().replace(/\/$/,"");
type Credentials={code:string;token:string;seat:"host"|"guest"};
type RoomView={
 status:"waiting"|"playing"|"finished";seat:"host"|"guest";version:number;
 hostChampion:string;guestChampion:string|null;myTurn:boolean;game:GameState|null;
};
const stored=(code:string):Credentials|null=>{
  try {
    const found=JSON.parse(localStorage.getItem("daggerlight-room-"+code)||"null") as Credentials|null;
    return found?.token&&found.code===code?found:null;
  }catch{return null;}
};
const roomFromLink=()=>{
  try {return (new URL(window.location.href).searchParams.get("room")||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);}
  catch{return "";}
};
function CardPreview({card,small=false}:{card:CardDefinition;small?:boolean}) {
  const style=card.art?{
    backgroundImage:cardSpriteBackground(card),
    backgroundSize:"300% 200%",
    backgroundPosition:`${card.art.column*50}% ${card.art.row*100}%`
  }:undefined;
  return <span className={"pvp-card-face"+(small?" small":"")} style={style} title={card.name}>
    {card.trait&&<span className="pvp-card-trait">{card.trait.toUpperCase()}</span>}
    {!card.art&&<><b>{card.power}</b><strong>{card.name}</strong><small>{card.text}</small></>}
  </span>;
}
function BoardPlay({played}:{played:EnginePlay}){
  return <div className="pvp-board-play"><CardPreview card={played.card} small/></div>;
}
export default function Multiplayer({onBack}:{onBack:()=>void}) {
  const [code,setCode]=useState(()=>roomFromLink());
  const [credentials,setCredentials]=useState<Credentials|null>(()=>stored(roomFromLink()));
  const [champion,setChampion]=useState("dextral");
  const [view,setView]=useState<RoomView|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<number|null>(null);
  const [daggersToUse,setDaggersToUse]=useState(0);
  const [specialMode,setSpecialMode]=useState<"relic"|"symmetry"|null>(null);
  const [inspected,setInspected]=useState<CardDefinition|null>(null);
  const [inspectedSpecial,setInspectedSpecial]=useState<SpecialKind|null>(null);
  const [resultOpen,setResultOpen]=useState(false);
  const [fun,setFun]=useState(4),[clarity,setClarity]=useState(4),[comment,setComment]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const lastDuelCount=useRef(0);
  const finishedSaved=useRef(false);
  const available=ENDPOINT.startsWith("https://") || (import.meta.env.DEV&&ENDPOINT.startsWith("http://"));
  const session=credentials?.code===code?credentials:null;

  async function api(method:string,path:string,body?:object,token?:string) {
    const response=await fetch(ENDPOINT+path,{
      method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const json=await response.json() as Record<string,unknown>;
    if(!response.ok)throw new Error(String(json.error||"No se pudo conectar."));
    return json;
  }
  async function sync(creds:Credentials){
    const data=await api("GET","/api/rooms/"+creds.code,undefined,creds.token);
    setView(data as unknown as RoomView);
  }
  useEffect(()=>{
    if(!session||!available)return;
    let cancelled=false;
    const poll=()=>{
      void api("GET","/api/rooms/"+session.code,undefined,session.token).then(data=>{
        if(!cancelled){setView(data as unknown as RoomView);setError("");}
      }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Sin conexión.");});
    };
    poll();
    const id=window.setInterval(poll,1600);
    return ()=>{cancelled=true;window.clearInterval(id);};
  },[session?.code,session?.token,available]);

  const game=view?.game||null;
  const duelCount=game?.events.filter(e=>e.kind==="duel").length||0;
  useEffect(()=>{
    if(!game)return;
    if(duelCount>lastDuelCount.current)setResultOpen(true);
    lastDuelCount.current=duelCount;
    if(game.phase==="finished" && credentials && !finishedSaved.current){
      finishedSaved.current=true;
      saveHumanMatch(credentials.code,game);
    }
  },[game,duelCount,credentials?.code]);
  const myTurn=!!view?.myTurn&&!busy;
  const legal=game&&myTurn&&game.phase==="awaiting_player"?legalPositions(game.player):[];
  const canPlace=selected!==null&&myTurn&&game?.phase==="awaiting_player";
  const specialHand=game?.player.specialHand||[];
  const daggersAvailable=specialHand.filter(x=>x==="dagger").length;
  const symmetryTargets=game?copyTargets(game.opponent):[];
  const invite=useMemo(()=>{
    try {const url=new URL(window.location.href);url.searchParams.set("room",code);return url.toString();}
    catch{return window.location.href;}
  },[code]);

  async function createOrJoin(create:boolean){
    setBusy(true);setError("");
    try {
      const target=create?"/api/rooms":"/api/rooms/"+code+"/join";
      const answer=await api("POST",target,{champion});
      const next={code:String(answer.code||code),token:String(answer.token),seat:answer.seat as "host"|"guest"};
      setCode(next.code);setCredentials(next);
      localStorage.setItem("daggerlight-room-"+next.code,JSON.stringify(next));
      const url=new URL(window.location.href);url.searchParams.set("room",next.code);
      window.history.replaceState(null,"",url);
      await sync(next);
    }catch(e){setError(e instanceof Error?e.message:"Error al crear la sala.");}
    finally{setBusy(false);}
  }
  async function send(action:object){
    if(!session||!view)return;
    setBusy(true);setError("");
    try {
      await api("POST","/api/rooms/"+session.code+"/action",{...action,version:view.version},session.token);
      setSelected(null);setDaggersToUse(0);setSpecialMode(null);
      await sync(session);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo completar la jugada.");}
    finally{setBusy(false);}
  }
  async function submitFeedback(){
    if(!session)return;
    setBusy(true);
    try{
      await api("POST","/api/rooms/"+session.code+"/feedback",{fun,clarity,comment:comment.slice(0,500)},session.token);
      saveFeedback("pvp-"+session.code,{diversion:fun,claridad:clarity,comentario:comment});
      setSubmitted(true);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo enviar el feedback.");}
    finally{setBusy(false);}
  }
  async function exportReport(){
    if(!session)return;
    try{const report=await api("GET","/api/rooms/"+session.code+"/report",undefined,session.token);
      downloadPlaytest("daggerlight-pvp-"+session.code+".json",JSON.stringify(report,null,2));
    }catch(e){setError(e instanceof Error?e.message:"No se pudo descargar.");}
  }

  return <main className="fo-shell pvp-screen">
    <header className="fo-topbar">
      <button type="button" className="fo-back" onClick={onBack}>← INICIO</button>
      <span className="fo-wordmark">DAGGERLIGHT · PVP</span>
      <ThemeToggle/>
    </header>
    <div className="pvp-inner">
      <h1>MULTIJUGADOR</h1>
      {!available ? <div className="pvp-notice">
        <strong>SERVIDOR PVP PENDIENTE DE ACTIVACIÓN</strong>
        <p>La interfaz y el motor multijugador están preparados. Falta conectar el servicio de salas privadas antes de poder invitar a otro jugador.</p>
        <p>Las partidas contra la IA siguen disponibles sin conexión.</p>
      </div>:!session ? <section className="pvp-join">
        <label>CAMPEÓN
          <select value={champion} onChange={e=>setChampion(e.target.value)}>
            {Object.values(champions).map(c=><option key={c.id} value={c.id}>{championShortName(c.name).toUpperCase()}</option>)}
          </select>
        </label>
        <div className="pvp-hero-champion"><img src={championImageUrl(champion)} alt="" />
          <strong>{championShortName(champions[champion].name).toUpperCase()}</strong>
          <p>{champions[champion].text}</p>
        </div>
        {code ? <><p>INVITACIÓN · SALA {code}</p>
          <button onClick={()=>void createOrJoin(false)} disabled={busy}>UNIRME A LA PARTIDA</button>
          <button className="pvp-minor" onClick={()=>{setCode("");window.history.replaceState(null,"",window.location.pathname);}}>CREAR OTRA SALA</button>
        </> : <button onClick={()=>void createOrJoin(true)} disabled={busy}>CREAR SALA PRIVADA</button>}
      </section> : <section className="pvp-game">
        <div className="pvp-roomline">
          <strong>SALA {code}</strong>
          <span>{view?.status==="waiting"?"ESPERANDO RIVAL":view?.status==="finished"?"PARTIDA TERMINADA":"PARTIDA EN CURSO"}</span>
          <button onClick={()=>void navigator.clipboard.writeText(invite)}>COPIAR INVITACIÓN</button>
        </div>
        {view?.status==="waiting" || !game ? <div className="pvp-notice">
          <h2>ESPERANDO AL SEGUNDO JUGADOR</h2>
          <p>Compartí el enlace con tu amigo. Cada persona debe entrar desde su propio navegador.</p>
          <input readOnly value={invite} onFocus={e=>e.target.select()}/>
        </div> : <>
          <div className="pvp-scoreline">
            <div><img src={championImageUrl(game.opponent.champion.id,true)} alt=""/><strong>{championShortName(game.opponent.champion.name).toUpperCase()}</strong><span>{game.opponent.life} ♥</span></div>
            <strong>RONDA {game.round} · DUELO {game.turn} · {game.duelScore.player}—{game.duelScore.opponent}</strong>
            <div><img src={championImageUrl(game.player.champion.id,true)} alt=""/><strong>{championShortName(game.player.champion.name).toUpperCase()}</strong><span>{game.player.life} ♥</span></div>
          </div>
          <div className="pvp-status" role="status">{game.phase==="finished"?"PARTIDA FINALIZADA":
            game.phase==="awaiting_quiero"?(myTurn?"ELEGÍ: QUIERO O NO QUIERO":"EL RIVAL DECIDE QUIERO O NO QUIERO"):
            myTurn?(game.pendingOpponentPlay?"TE TOCA RESPONDER":"TE TOCA ABRIR"):
            "ESPERANDO LA JUGADA RIVAL"}</div>
          <div className="pvp-board">
            {positions.map(pos=><section key={pos} className="pvp-lane"
              onDragOver={event=>{if(event.dataTransfer.types.includes("text/plain"))event.preventDefault();}}
              onDrop={event=>{if(event.dataTransfer.getData("text/plain")==="daggerlight-relic"){
                event.preventDefault();
                if(myTurn)void send({type:"special",kind:"relic",position:pos});
              }}}>
              <h2>{positionLabels[pos]}</h2>
              <div className="pvp-lane-cards">
                <span>{game.opponent.roundPlays.filter(p=>p.position===pos).length} / {pos==="siniestra"&&game.opponent.champion.id==="sinistral"?2:1} ·
                  {specialMode==="symmetry"&&myTurn&&game.opponent.archives[pos].some(card=>card.specialArchiveKind==="dagger")
                    ? <button className="pvp-archive-copy" title="Copiar la Daga archivada"
                        onClick={()=>void send({type:"special",kind:"symmetry",target:{kind:"dagger",position:pos}})}>
                        ARCHIVO {game.opponent.archives[pos].length} · DAGA
                      </button>
                    : <span>ARCHIVO {game.opponent.archives[pos].length}</span>}
                </span>
                <div className="pvp-field-manifests" aria-label="Especiales rivales">
                  {game.opponent.manifestations?.filter(t=>t.position===pos).map((token,i)=>
                    <button type="button" key={token.kind+"-"+i}
                      className={specialMode==="symmetry"&&myTurn?"is-copy-target":""}
                      title={specialMode==="symmetry"&&myTurn
                        ? "Copiar "+SPECIAL_NAME[token.kind]:SPECIAL_TEXT[token.kind]}
                      onClick={()=>specialMode==="symmetry"&&myTurn
                        ? void send({type:"special",kind:"symmetry",target:{kind:token.kind,position:pos}})
                        :setInspectedSpecial(token.kind)}>
                      <ManifestCard kind={token.kind} size="field"/>
                    </button>)}
                </div>
                <div>{game.opponent.roundPlays.filter(p=>p.position===pos).map((p,i)=><button key={i} onClick={()=>setInspected(p.card)}><BoardPlay played={p}/></button>)}
                {game.pendingOpponentPlay?.position===pos&&<button onClick={()=>setInspected(game.pendingOpponentPlay!.card)}><BoardPlay played={game.pendingOpponentPlay}/></button>}</div>
              </div>
              <div className="pvp-lane-cards">
                <span>{game.player.roundPlays.filter(p=>p.position===pos).length} / {legalPositions(game.player).includes(pos)?"1+":"1"} · ARCHIVO {game.player.archives[pos].length}</span>
                <div className="pvp-field-manifests" aria-label="Tus especiales">
                  {game.player.manifestations?.filter(t=>t.position===pos).map((token,i)=>
                    <button type="button" key={token.kind+"-"+i}
                      title={SPECIAL_TEXT[token.kind]} onClick={()=>setInspectedSpecial(token.kind)}>
                      <ManifestCard kind={token.kind} size="field"/>
                    </button>)}
                </div>
                <div>{game.player.roundPlays.filter(p=>p.position===pos).map((p,i)=><button key={i} onClick={()=>setInspected(p.card)}><BoardPlay played={p}/></button>)}
                  {game.pendingPlayerPlay?.position===pos&&<button onClick={()=>setInspected(game.pendingPlayerPlay!.card)}><BoardPlay played={game.pendingPlayerPlay}/></button>}
                </div>
              </div>
              <button className="pvp-place"
                disabled={specialMode==="relic"
                  ? !myTurn || game.phase!=="awaiting_player" || game.player.roundPlays.some(p=>p.position===pos)
                  : !canPlace||!legal.includes(pos)}
                onClick={()=>void send(specialMode==="relic"
                  ? {type:"special",kind:"relic",position:pos}
                  : {type:"play",handIndex:selected,position:pos,daggers:Math.min(daggersToUse,daggersAvailable)})}>
                {specialMode==="relic"&&myTurn?"COLOCAR RELIQUIA":canPlace&&legal.includes(pos)?"JUGAR ACÁ":"—"}
              </button>
            </section>)}
          </div>
          {game.phase==="awaiting_quiero"&&myTurn&&<div className="pvp-decide">
            <button onClick={()=>void send({type:"quiero",wants:false})}>NO QUIERO</button>
            <button onClick={()=>void send({type:"quiero",wants:true})}>QUIERO</button>
          </div>}
          <section className="pvp-hand">
            <h2>TU MANO</h2>
            {!!specialHand.length && <>
              {specialMode==="relic"&&<p className="pvp-special-guidance">RELIQUIA · ELEGÍ UNA POSICIÓN DEL CAMPO</p>}
              {specialMode==="symmetry"&&<p className="pvp-special-guidance">
                {symmetryTargets.length
                  ? "SIMETRÍA · TOCÁ UNA CARTA RIVAL O DAGA ARCHIVADA"
                  : "NO HAY ESPECIALES RIVALES VISIBLES PARA COPIAR"}
              </p>}
              <div className="pvp-manifest-hand" aria-label="Cartas especiales en tu mano">
                {specialHand.map((kind,index)=>{
                  const ordinal=kind==="dagger"
                    ? specialHand.slice(0,index+1).filter(k=>k==="dagger").length:0;
                  const chosen=kind==="dagger"?ordinal<=daggersToUse:specialMode===kind;
                  return <div key={kind+"-"+index} className={"pvp-manifest-entry"+(chosen?" is-selected":"")}>
                    <button type="button" className="pvp-manifest-select"
                      disabled={!myTurn||game.phase!=="awaiting_player"}
                      draggable={kind==="relic"&&myTurn}
                      aria-pressed={chosen}
                      aria-label={SPECIAL_NAME[kind]}
                      onDragStart={event=>{
                        if(kind==="relic"){
                          setSpecialMode("relic");
                          event.dataTransfer.setData("text/plain","daggerlight-relic");
                        }
                      }}
                      onClick={()=>{
                        if(kind==="dagger"){setSpecialMode(null);setDaggersToUse(chosen?ordinal-1:ordinal);}
                        else{setDaggersToUse(0);if(kind==="relic"||kind==="symmetry")setSpecialMode(specialMode===kind?null:kind);
                          else setInspectedSpecial(kind);}
                      }}>
                      <ManifestCard kind={kind} size="hand" selected={chosen}/>
                    </button>
                    <button type="button" className="pvp-manifest-info"
                      aria-label={"Ver "+SPECIAL_NAME[kind]}
                      onClick={()=>setInspectedSpecial(kind)}>i</button>
                  </div>;
                })}
              </div>
            </>}
            <div>{game.player.hand.map((card,i)=><button key={card.id+"-"+i}
              className={selected===i?"selected":""} disabled={!myTurn||game.phase!=="awaiting_player"} onClick={()=>setSelected(i)}>
              <CardPreview card={card}/>
              </button>)}</div>
          </section>
          {game.phase==="finished"&&<section className="pvp-summary">
            <h2>{game.winner==="draw"?"EMPATE":game.winner==="player"?"VICTORIA":"DERROTA"}</h2>
            <p>{game.player.life}—{game.opponent.life} VIDA</p>
            {!submitted ? <>
              <div className="pvp-ratings"><label>DIVERSIÓN <select value={fun} onChange={e=>setFun(+e.target.value)}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                <label>CLARIDAD <select value={clarity} onChange={e=>setClarity(+e.target.value)}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
              <textarea maxLength={500} rows={3} placeholder="¿Qué mejorarías?" value={comment} onChange={e=>setComment(e.target.value)}/>
              <button onClick={()=>void submitFeedback()} disabled={busy}>ENVIAR FEEDBACK</button>
            </>:<p>FEEDBACK GUARDADO</p>}
            <button onClick={()=>void exportReport()}>EXPORTAR REPORTE</button>
          </section>}
          {resultOpen&&game.lastDuel&&<div className="pvp-result-overlay" role="dialog" aria-modal="true" aria-label="Duelo resuelto">
            <div><h2>{game.lastDuel.outcome==="draw"?"EMPATE":game.lastDuel.outcome==="player"?"DUELO GANADO":"DUELO PERDIDO"}</h2>
              <div className="pvp-duel-cards">
                <CardPreview card={game.lastDuel.playerPlay.card}/>
                <span>{game.lastDuel.playerPlay.finalPower} — {game.lastDuel.opponentPlay.finalPower}</span>
                <CardPreview card={game.lastDuel.opponentPlay.card}/>
              </div>
              <button onClick={()=>setResultOpen(false)}>CONTINUAR</button>
            </div>
          </div>}
          {inspectedSpecial&&<ManifestCardDialog kind={inspectedSpecial} onClose={()=>setInspectedSpecial(null)}/>}
          {inspected&&<div className="pvp-result-overlay" role="dialog" aria-modal="true" aria-label={inspected.name}
            onClick={()=>setInspected(null)}>
            <div onClick={e=>e.stopPropagation()}><CardPreview card={inspected}/><p>{inspected.text}</p>
              <button onClick={()=>setInspected(null)}>CERRAR</button></div>
          </div>}
        </>}
      </section>}
      {error&&<p className="pvp-error" role="alert">{error}</p>}
    </div>
  </main>;
}
