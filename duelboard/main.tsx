import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { startGame, submitPlayerPlay, answerQuiero } from "../src/engine/game";
import { legalPositions } from "../src/engine/rules";
import type { CardDefinition, Position } from "../src/types";
import type { EnginePlay, GameState, PlayerState } from "../src/engine/types";
import "./style.css";

/**
 * The uploaded Main.dc.html is a design reference, not a gameplay implementation.
 * This UI deliberately uses the existing Daggerlight engine and Card Studio art.
 * No decorative number or mock-play is allowed to affect real game state.
 */
const POSITIONS: Position[] = ["siniestra", "trono", "diestra"];
const LABEL: Record<Position, string> = { siniestra:"Siniestra", trono:"Trono", diestra:"Diestra" };
const FACE_URL: Record<string,string> = {
  dextral:"./champions/faces/dextral.webp",
  sinistral:"./champions/faces/sinistral.webp",
  athos:"./champions/faces/athos.webp",
  vinira:"./champions/faces/vinira.webp",
  empireos:"./champions/faces/empireos.webp",
  desartes:"./champions/faces/desartes.webp",
  santo_simetrico:"./champions/faces/santo_simetrico.webp",
  samas:"./champions/faces/samas.webp",
  prioresa_luna_llena:"./champions/faces/prioresa_luna_llena.webp"
};

function spriteStyle(card: CardDefinition): React.CSSProperties {
  if (!card.art) return {};
  return {
    backgroundImage:'url("' + card.art.sprite + '")',
    backgroundSize:"300% 200%",
    backgroundPosition:(card.art.column * 50) + "% " + (card.art.row * 100) + "%"
  };
}

function CardFace({card, power, className="", title}: {
  card:CardDefinition; power?:number; className?:string; title?:string;
}) {
  return <div className={"physical-card " + className} style={spriteStyle(card)}
    aria-label={title || card.name + " · Poder " + card.power}
    title={title || card.name + " · Poder " + card.power + " · " + card.text}>
    {!card.art && <div className="fallback-card">
      <strong>{card.power}</strong><span>{card.name}</span><p>{card.text}</p>
    </div>}
    {power!==undefined && <span className="resolved-power" title="Poder final del duelo">{power}</span>}
  </div>;
}

function LifeGems({player, owner}: {player:PlayerState;owner:"self"|"rival"}) {
  return <div className={"life-gems "+owner} aria-label={"Vida "+player.life+" de "+player.champion.life}>
    {Array.from({length:player.champion.life},(_,i)=>
      <span key={i} className={"life-gem "+(i<player.life?"full":"empty")}/>)}
  </div>;
}

function ChampionMedallion({player, owner, onInspect}:{
  player:PlayerState;owner:"self"|"rival";onInspect:(text:string)=>void;
}) {
  const name=player.champion.name.split(",")[0];
  return <section className={"champion-piece "+owner} aria-label={owner==="self"?"Tu Champion":"Champion rival"}>
    <button className="champion-portrait" onClick={()=>onInspect(player.champion.name+" — "+player.champion.text)}
      aria-label={"Ver habilidad de "+name} title={player.champion.text}>
      <img src={FACE_URL[player.champion.id] || FACE_URL.dextral} alt={name}
        onError={e=>{e.currentTarget.style.visibility="hidden";}}/>
    </button>
    <div className="champion-nameplate">{name}</div>
    <LifeGems player={player} owner={owner}/>
    <div className="champion-life" aria-label={"Vida "+player.life}>{player.life}</div>
    <span className="champion-side-label">{owner==="self"?"VOS":"RIVAL"}</span>
  </section>;
}

function ArchiveStack({count, side}: {count:number;side:"self"|"rival"}) {
  return <div className={"archive-counter "+side} aria-label={"Archivo "+count}>
    <span className="archive-stack-icon" aria-hidden="true"><i/><i/><i/></span>
    <span className="archive-word">ARCHIVO</span>
    <strong>{count}</strong>
  </div>;
}

function LaneSlot({side, lane, plays, selected, legal, hovering, onPlay}:{
  side:"self"|"rival";lane:Position;plays:EnginePlay[];
  selected:boolean;legal:boolean;hovering:boolean;onPlay:()=>void;
}) {
  const playable=side==="self"&&legal;
  return <button type="button"
    className={"duel-slot "+side+(playable?" available":"")+(hovering?" target":"")+(selected&&playable?" ready":"")}
    data-drop-player={side==="self"?lane:undefined}
    onClick={playable?onPlay:undefined}
    disabled={!playable}
    aria-label={(side==="self"?"Jugar en ":"Cartas rivales en ")+LABEL[lane]}>
    <span className="slot-inner" aria-hidden="true"/>
    <span className="slot-ring" aria-hidden="true"><i/></span>
    {plays.length===0 && <span className="empty-sigil" aria-hidden="true">✦</span>}
    <span className={"played-stack played-"+Math.min(plays.length,3)}>
      {plays.map((play,index)=><CardFace key={play.card.id+"-"+index}
        card={play.card} power={play.finalPower} className={"played-card stack-"+index}
        title={play.card.name+" · "+LABEL[play.position]+
          (play.finalPower===undefined?"":" · Poder "+play.finalPower)}/>)}
    </span>
    {hovering && <span className="drop-callout">SOLTAR EN {LABEL[lane].toUpperCase()}</span>}
  </button>;
}

function CardBack({index}: {index:number}) {
  return <span className="card-back" style={{left:"calc(50% + "+((index-1)*61)+"px)",transform:"translateX(-50%) rotate("+((index-1)*7)+"deg)"}} aria-label="Carta rival oculta">
    <i className="back-crest">✦</i>
  </span>;
}

function TableauBoard(){
  const [game,setGame]=useState<GameState>(()=>startGame("dextral","sinistral",Math.random,"player","normal"));
  const [selected,setSelected]=useState<number|null>(null);
  const [hovering,setHovering]=useState<Position|null>(null);
  const [drag,setDrag]=useState<{index:number;x:number;y:number}|null>(null);
  const [inspector,setInspector]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const pointer=useRef<{index:number;x:number;y:number;started:boolean}|null>(null);
  const legal=game.phase==="awaiting_player"?legalPositions(game.player):[];
  const latest=game.events.at(-1)?.text||"";
  const currentMessage=notice||latest;
  const selectedCard=selected===null?null:game.player.hand[selected]??null;

  useEffect(()=>{
    document.documentElement.dataset.boardReady="true";
    (window as Window & {__daggerlightBoardDebug?:()=>unknown}).__daggerlightBoardDebug=()=>({
      round:game.round,turn:game.turn,phase:game.phase,
      playerLife:game.player.life,opponentLife:game.opponent.life,
      playerPlays:game.player.roundPlays.map(p=>[p.card.id,p.position]),
      opponentPlays:game.opponent.roundPlays.map(p=>[p.card.id,p.position]),
      hand:game.player.hand.map(c=>c.id),archives:game.player.archives,
      selected,dragging:drag?.index??null
    });
  },[game,selected,drag]);

  function reset(){
    pointer.current=null;setSelected(null);setHovering(null);setDrag(null);setInspector(null);setNotice("");
    setGame(startGame("dextral","sinistral",Math.random,"player","normal"));
  }
  function play(index:number,position:Position) {
    if(game.phase!=="awaiting_player"||!game.player.hand[index]||!legal.includes(position))return;
    try{
      submitPlayerPlay(game,index,position);
      setGame({...game});setSelected(null);setDrag(null);setHovering(null);
      const d=game.lastDuel;
      if((game.phase as GameState["phase"])==="finished")setNotice(game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE");
      else if(d)setNotice(d.outcome==="draw"?"EMPATE · "+d.playerPlay.finalPower+" — "+d.opponentPlay.finalPower:
        (d.outcome==="player"?"DUELO GANADO · ":"DUELO PERDIDO · ")+d.playerPlay.finalPower+" — "+d.opponentPlay.finalPower);
      else setNotice("");
    }catch(e){setNotice(String(e));setDrag(null);setHovering(null);}
  }
  function findPosition(x:number,y:number):Position|null {
    for(const lane of POSITIONS){
      const r=document.querySelector('[data-drop-player="'+lane+'"]')?.getBoundingClientRect();
      if(r && x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom) return lane;
    }
    return null;
  }
  function onHandDown(e:React.PointerEvent,index:number){
    if(game.phase!=="awaiting_player" || e.button!==0)return;
    pointer.current={index,x:e.clientX,y:e.clientY,started:false};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onHandMove(e:React.PointerEvent) {
    const p=pointer.current;
    if(!p)return;
    if(!p.started && Math.hypot(e.clientX-p.x,e.clientY-p.y)>8){
      p.started=true;setSelected(p.index);
    }
    if(p.started){
      setDrag({index:p.index,x:e.clientX,y:e.clientY});
      const lane=findPosition(e.clientX,e.clientY);
      setHovering(lane&&legal.includes(lane)?lane:null);
    }
  }
  function onHandUp(e:React.PointerEvent) {
    const p=pointer.current;pointer.current=null;
    if(!p)return;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    const lane=p.started?findPosition(e.clientX,e.clientY):null;
    setHovering(null);setDrag(null);
    if(p.started){
      if(lane&&legal.includes(lane))play(p.index,lane);
      else setSelected(p.index);
    }else setSelected(selected===p.index?null:p.index);
  }
  function onHandCancel(){pointer.current=null;setDrag(null);setHovering(null);}
  function chooseQuiero(wants:boolean){
    answerQuiero(game,wants);
    setGame({...game});setSelected(null);setNotice(wants?"TERCER DUELO":"SIGUIENTE RONDA");
  }
  const playerPlays=(lane:Position)=>game.player.roundPlays.filter(p=>p.position===lane);
  const opponentPlays=(lane:Position)=>[
    ...game.opponent.roundPlays.filter(p=>p.position===lane),
    ...(game.pendingOpponentPlay?.position===lane?[game.pendingOpponentPlay]:[])
  ];

  return <div className="screen">
    <div className="board-wrap">
      <header className="board-header">
        <div className="game-brand"><span className="brand-crown" aria-hidden="true">♛</span><span>DAGGERLIGHT</span><small>DUEL BOARD</small></div>
        <div className="battle-progress"><span>RONDA {game.round}</span><i/> <span>DUELO {game.turn} / 3</span></div>
        <button className="reset-button" onClick={reset} title="Comenzar una partida nueva">↻ <span>NUEVA PARTIDA</span></button>
      </header>
      <main className="tabletop" aria-label="Tablero de duelo Daggerlight">
        <div className="stone-grain" aria-hidden="true"/>
        <svg className="engraved-rings" viewBox="0 0 1400 830" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#bfa46f" strokeOpacity=".14">
            <circle cx="700" cy="410" r="180"/><circle cx="700" cy="410" r="300"/>
            <circle cx="700" cy="410" r="450"/><circle cx="700" cy="410" r="590"/>
            <path d="M30 410H1370 M700 15V820 M270 40L1130 795 M1130 40L270 795"/>
          </g>
          <g fill="none" stroke="#070707" strokeOpacity=".43" strokeWidth="3">
            <circle cx="700" cy="410" r="184"/><circle cx="700" cy="410" r="304"/>
          </g>
        </svg>
        <aside className="left-rail" aria-label="Champions y marcador">
          <ChampionMedallion player={game.opponent} owner="rival" onInspect={setInspector}/>
          <div className="match-score"><span>MARCADOR</span><strong>{game.duelScore.opponent}<i>—</i>{game.duelScore.player}</strong></div>
          <ChampionMedallion player={game.player} owner="self" onInspect={setInspector}/>
        </aside>

        <section className="central-arena" aria-label="Posiciones de duelo">
          <div className="opponent-hand" aria-label={game.opponent.hand.length+" cartas restantes del rival"}>
            {game.opponent.hand.map((_,i)=><CardBack key={i} index={i}/>)}
          </div>
          <div className="lane-grid">
            {POSITIONS.map((lane,i)=><div className={"lane lane-"+lane} key={lane}>
              <LaneSlot side="rival" lane={lane} plays={opponentPlays(lane)}
                selected={false} legal={false} hovering={false} onPlay={()=>{}}/>
              <ArchiveStack count={game.opponent.archives[lane].length} side="rival"/>
              <div className="lane-divider">
                <span className="lane-number">0{i+1}</span><strong>{LABEL[lane]}</strong>
                <span className="lane-ornament">{lane==="trono"?"♛":lane==="siniestra"?"☾":"✧"}</span>
              </div>
              <ArchiveStack count={game.player.archives[lane].length} side="self"/>
              <LaneSlot side="self" lane={lane} plays={playerPlays(lane)}
                selected={selected!==null} legal={legal.includes(lane)} hovering={hovering===lane}
                onPlay={()=>{if(selected!==null)play(selected,lane);}}/>
            </div>)}
          </div>
          <div className="combat-message" aria-live="polite">{currentMessage}</div>
        </section>

        <aside className="right-rail" aria-label="Mazos y ronda">
          <div className="deck-meta opponent-deck"><span>MAZO RIVAL</span><div className="mini-deck"><span className="back-crest">✦</span></div><strong>{game.opponent.deck.length}</strong></div>
          <div className="round-medallion"><span>RONDA</span><strong>{String(game.round).padStart(2,"0")}</strong><small>DUELO {game.turn}</small><div className="round-gems">{[1,2,3].map(n=><i className={n<=game.turn?"active":""} key={n}/>)}</div></div>
          <div className="deck-meta own-deck"><span>TU MAZO</span><div className="mini-deck"><span className="back-crest">✦</span></div><strong>{game.player.deck.length}</strong></div>
        </aside>

        <section className="hand-zone" aria-label="Tu mano">
          <div className="hand-velvet"/>
          <div className="hand-hint">
            {selectedCard?"ELEGÍ UNA POSICIÓN PARA "+selectedCard.name:
              "ARRASTRÁ UNA CARTA O TOCÁ PARA ELEGIR"}
          </div>
          <div className="hand-cards">
            {game.player.hand.map((card,index)=><div key={card.id+"-"+index}
              className={"hand-card hand-"+index+(selected===index?" chosen":"")+(drag?.index===index?" dragging-source":"")}
              role="button" tabIndex={0} aria-pressed={selected===index}
              aria-label={"Elegir "+card.name}
              onPointerDown={e=>onHandDown(e,index)}
              onPointerMove={onHandMove}
              onPointerUp={onHandUp}
              onPointerCancel={onHandCancel}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(index);}}}>
              <CardFace card={card}/>
            </div>)}
          </div>
          <div className="hand-counter">TU MANO · {game.player.hand.length} CARTAS</div>
        </section>
      </main>
      <div className="board-footer"><span>PROTOTIPO HTML · MOTOR REAL DE DAGGERLIGHT</span><span>DRAG & DROP · TOCAR + ELEGIR</span></div>
    </div>

    {drag&&game.player.hand[drag.index]&&<div className="drag-ghost"
       style={{left:drag.x,top:drag.y}} aria-hidden="true">
      <CardFace card={game.player.hand[drag.index]}/>
    </div>}
    {inspector&&<div className="dialog-backdrop" onClick={()=>setInspector(null)}>
      <div className="decision-dialog inspector-dialog" role="dialog" aria-label="Habilidad de Champion" onClick={e=>e.stopPropagation()}>
        <span className="dialog-eyebrow">CHAMPION</span><p>{inspector}</p>
        <button className="decision-primary" onClick={()=>setInspector(null)}>CERRAR</button>
      </div>
    </div>}
    {game.phase==="awaiting_quiero"&&<div className="dialog-backdrop">
      <div className="decision-dialog" role="dialog" aria-label="Quiero o No quiero" aria-modal="true">
        <span className="dialog-eyebrow">DECISIÓN DE RONDA</span>
        <h2>¿QUIERO O NO QUIERO?</h2>
        <p>Perdiste los dos primeros duelos. ¿Querés jugar el tercero?</p>
        <div className="decision-actions">
          <button className="decision-secondary" onClick={()=>chooseQuiero(false)}>NO QUIERO</button>
          <button className="decision-primary" onClick={()=>chooseQuiero(true)}>QUIERO</button>
        </div>
      </div>
    </div>}
    {game.phase==="finished"&&<div className="dialog-backdrop">
      <div className="decision-dialog" role="dialog" aria-label="Fin de partida" aria-modal="true">
        <span className="dialog-eyebrow">PARTIDA TERMINADA</span>
        <h2>{game.winner==="player"?"VICTORIA":game.winner==="opponent"?"DERROTA":"EMPATE"}</h2>
        <p>{game.player.champion.name.split(",")[0]} · {game.player.life} Vida frente a {game.opponent.life} Vida</p>
        <button className="decision-primary" onClick={reset}>NUEVA PARTIDA</button>
      </div>
    </div>}
  </div>;
}

createRoot(document.getElementById("root")!).render(<TableauBoard/>);
