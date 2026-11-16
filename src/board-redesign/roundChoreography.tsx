import { useEffect, useRef } from "react";
import type { GameState, RoundSummary, Side } from "../engine/types";
import type { Position } from "../types";
import type { BoardMotionSequence } from "./motion";

/**
 * Round captions are drawn from the engine's persisted RoundSummary,
 * not from the presentation's own duel tally.
 */
export function completedRoundReceipt(motion: BoardMotionSequence | null, after: GameState): RoundSummary | null {
  if (!motion?.roundEnded || after.round !== motion.before.round + 1) return null;
  const summary = after.rounds.at(-1);
  return summary?.round === motion.before.round ? summary : null;
}

/** Signed delta is deliberate: some cards can clear an Archive in the same
 * duel, so the final count must not be represented as only added cards. */
export function archiveCountChange(
  before: GameState, after: GameState, side: Side, position: Position
): number {
  return after[side].archives[position].length - before[side].archives[position].length;
}

interface TimedProps {
  sequenceId: number;
  reducedMotion: boolean;
  onComplete: () => void;
}

export function RoundTransition({sequenceId,reducedMotion,onComplete,summary}:TimedProps & {
  summary: RoundSummary | null;
}) {
  const current=useRef(onComplete);
  current.current=onComplete;
  useEffect(()=>{
    const timer=window.setTimeout(()=>current.current(),reducedMotion?240:1450);
    return ()=>window.clearTimeout(timer);
  },[sequenceId,reducedMotion]);
  const reason=summary?.reason==="player_no_quiero"?"NO QUIERO":
    summary?.reason==="opponent_no_quiero"?"EL RIVAL DIJO NO QUIERO":null;
  const outcome=summary?.score.player===summary?.score.opponent?"EMPATE":
    (summary?.score.player??0)>(summary?.score.opponent??0)?"GANASTE LA RONDA":"EL RIVAL GANÓ LA RONDA";
  return <div className="board-round-transition" role="status" aria-live="polite">
    <div className="board-round-ceremony">
      <span className="board-round-kicker">{summary?"RONDA "+summary.round+" FINALIZADA":"RONDA FINALIZADA"}</span>
      {summary&&<strong className="board-round-score" aria-label={`Resultado de ronda: vos ${summary.score.player}, rival ${summary.score.opponent}`}>
        <span>{summary.score.player}</span><i>—</i><span>{summary.score.opponent}</span>
      </strong>}
      <span className="board-round-outcome">{summary?outcome:"PREPARANDO ARCHIVOS"}</span>
      {reason&&<span className="board-round-reason">{reason}</span>}
    </div>
  </div>;
}

/**
 * The on-field darkness pulls toward the existing right-hand duel score
 * while original played cards move to the engine's per-lane Archives.
 * This never implies that Archive cards are deposited in the score panel.
 */
export function ArchiveSweep() {
  // One moving surface, including its own luminous edge. A single 650ms
  // transform carries both together; separate animations drift and stutter.
  // Engine-owned Archive cards still travel to their actual positions.
  return <div className="board-archive-sweep" aria-hidden="true"/>;
}

export function ArchiveReceiptTransition({sequenceId,reducedMotion,onComplete}:TimedProps) {
  const current=useRef(onComplete);
  current.current=onComplete;
  useEffect(()=>{
    const timer=window.setTimeout(()=>current.current(),reducedMotion?230:480);
    return ()=>window.clearTimeout(timer);
  },[sequenceId,reducedMotion]);
  return <div className="board-archive-receipt" role="status" aria-live="polite">
    <span>ARCHIVOS ACTUALIZADOS</span>
  </div>;
}
