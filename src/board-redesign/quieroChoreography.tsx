import { useEffect, useRef } from "react";
import type { GameState } from "../engine/types";

/**
 * The engine exclusively determines who is allowed to make a Quiero decision.
 * Never calculate eligibility or change score in the presentation layer.
 */
export function shouldOfferQuiero(game:GameState):boolean {
  return game.mode!=="pvp" && game.phase==="awaiting_quiero" &&
    game.duelScore.player===0 && game.duelScore.opponent===2;
}

/** True only when the engine explicitly recorded the rival accepting a
 * third duel. A declined AI choice is already included in RoundSummary. */
export function rivalAcceptedQuiero(before:GameState,after:GameState):boolean {
  return after.mode!=="pvp" && before.round===after.round &&
    after.turn===3 && after.phase==="awaiting_player" &&
    after.duelScore.player===2 && after.duelScore.opponent===0 &&
    after.events.slice(before.events.length).some(event=>
      event.kind==="decision" && event.text==="IA: Quiero.");
}

export function QuieroChoiceStage({
  score,selected,onChoose,bannerImage
}:{
  score:{player:number;opponent:number};
  selected:boolean|null;
  bannerImage:string;
  onChoose:(wants:boolean)=>void;
}){
  const locked=selected!==null;
  const firstChoice=useRef<HTMLButtonElement>(null);
  useEffect(()=>{firstChoice.current?.focus();},[]);
  return <section className={"board-quiero-stage"+(locked?" is-committing":"")}
    role="dialog" aria-modal="true" aria-labelledby="board-quiero-title"
    aria-describedby="board-quiero-explainer">
    <div className="board-quiero-content">
      <span className="board-quiero-kicker">DECISIÓN DE RONDA</span>
      <div className="board-quiero-score" aria-label={`Marcador: vos ${score.player}; rival ${score.opponent}`}>
        <span>{score.player}</span><i>—</i><span>{score.opponent}</span>
      </div>
      <div className="board-quiero-banner" style={{
        backgroundImage:`linear-gradient(180deg,#080a08a8,#11180dbf),url("${bannerImage}")`
      }}>
        <span className="board-quiero-banner-overline">TERCER DUELO</span>
        <h2 id="board-quiero-title" className="board-quiero-title">¿QUERÉS CONTINUAR?</h2>
        <span className="board-quiero-banner-rule" aria-hidden="true"/>
        <p id="board-quiero-explainer" className="board-quiero-description">
          Podés disputar un punto más o cerrar la ronda.
        </p>
        <div className="board-quiero-choices" role="group" aria-label="Elegí si disputar el tercer duelo">
          <button ref={firstChoice} type="button" className={"board-quiero-yes"+(selected===true?" is-picked":"")}
            disabled={locked} onClick={()=>onChoose(true)}>QUIERO</button>
          <button type="button" className={"board-quiero-no"+(selected===false?" is-picked":"")}
            disabled={locked} onClick={()=>onChoose(false)}>NO QUIERO</button>
        </div>
        {locked&&<span className="board-quiero-selected" role="status" aria-live="polite">
          {selected?"QUIERO":"NO QUIERO"}
        </span>}
      </div>
    </div>
  </section>;
}

export function RivalQuieroStage({onComplete,reducedMotion,bannerImage}:{
  onComplete:()=>void;reducedMotion:boolean;bannerImage:string;
}){
  // The actual AI answer is already present in GameState.events. This stage
  // only acknowledges it before exposing the third-duel controls.
  const current=useRef(onComplete);
  current.current=onComplete;
  useEffect(()=>{
    const timer=window.setTimeout(()=>current.current(),reducedMotion?260:840);
    return ()=>window.clearTimeout(timer);
  },[reducedMotion]);
  return <div className={"board-quiero-stage board-quiero-rival"+(reducedMotion?" is-reduced":"")}
    role="status" aria-live="polite" aria-label="El rival quiere disputar el tercer duelo">
    <div className="board-quiero-content">
      <span className="board-quiero-kicker">EL RIVAL DECIDE</span>
      <div className="board-quiero-banner" style={{
        backgroundImage:`linear-gradient(180deg,#080a08a8,#11180dbf),url("${bannerImage}")`
      }}>
        <span className="board-quiero-banner-overline">TERCER DUELO</span>
        <strong className="board-quiero-rival-word">QUIERO</strong>
        <span className="board-quiero-banner-rule" aria-hidden="true"/>
        <span className="board-quiero-description">HABRÁ TERCER DUELO</span>
        <button className="board-quiero-rival-continue" type="button" onClick={onComplete}
          aria-label="Continuar al tercer duelo">CONTINUAR</button>
      </div>
    </div>
  </div>;
}
