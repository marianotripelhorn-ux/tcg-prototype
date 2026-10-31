import type { PendingAugury, PlayerState } from "./engine/types";

const descriptions: Record<string,string> = {
  augury_same_position: "misma posición",
  augury_printed6: "Poder impreso 6 o más",
  augury_trono: "Trono",
  augury_opposite_lateral: "lateral opuesta",
  augury_repeated_position: "posición repetida",
  augury_enemy_affinity: "carta con afinidad de posición"
};
function predictionLabel(augury:PendingAugury) {
  return augury.sourceName+" → "+(descriptions[augury.effect]??"predicción");
}
export default function AuguryStatus({player,opponent}:{player:PlayerState;opponent:PlayerState}) {
  const ownPriory=player.champion.faction==="ivory";
  const rivalPriory=opponent.champion.faction==="ivory";
  if(!ownPriory&&!rivalPriory)return null;
  const pending=ownPriory?player.pendingAuguries:opponent.pendingAuguries;
  const source=ownPriory?player:opponent;
  const buff=source.auguryBuff+source.auguryQueuedBuff;
  return (
    <div className="augury-status-strip" aria-label="Estado de los Augurios">
      <span className="augury-status-heading">☾ AUGURIO {ownPriory?"PROPIO":"RIVAL"}</span>
      {ownPriory && <span className="augury-status-count">Aciertos: {source.auguryHitsSinceHeal}/3 · Curaciones: {source.auguryHeals}/2</span>}
      {pending.length>0
        ? <span className="augury-status-pending" title={pending.map(predictionLabel).join(" · ")}>
            Pendiente: {pending.map(predictionLabel).join(" · ")}
          </span>
        : <span className="augury-status-none">Sin predicción pendiente</span>}
      {ownPriory&&buff>0&&<span className="augury-status-buff">+{buff} Poder disponible para tu próxima carta</span>}
    </div>
  );
}
