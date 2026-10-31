import type { PlayerState } from "./engine/types";

export default function AuguryStatus({player,opponent}:{player:PlayerState;opponent:PlayerState}) {
  const ownPriory=player.champion.faction==="ivory";
  const rivalPriory=opponent.champion.faction==="ivory";
  if(!ownPriory&&!rivalPriory)return null;
  const source=ownPriory?player:opponent;
  return (
    <div className="augury-status-strip" aria-label="Estado de los Augurios">
      <span className="augury-status-heading">☾ AUGURIO {ownPriory?"PROPIO":"RIVAL"}</span>
      <span className="augury-status-pending">Misma posición que el rival: +3 Poder en ese duelo</span>
      {ownPriory&&<span className="augury-status-count">
        Aciertos acumulados: {source.auguryHitsTotal} · Próxima curación: {source.auguryHitsSinceHeal}/3 · Curaciones: {source.auguryHeals}/2
      </span>}
    </div>
  );
}
