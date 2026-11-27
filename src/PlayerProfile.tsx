import { useMemo, useState } from "react";
import { championImageUrl, championShortName } from "./championArtwork";
import { FactionCardBack } from "./FactionCardBack";
import { champions } from "./engine/champions";
import { factionLabels } from "./data";
import { readDeckLibrary } from "./deckLibraryStorage";
import { cleanPlayerName, DEFAULT_PLAYER_NAME } from "./playerProfile";
import { profileStatistics, deckDisplayName } from "./profileStatistics";
import type { MatchRecord } from "./persistence";
import ThemeToggle from "./ThemeToggle";
import PlayerAvatar from "./PlayerAvatar";
import { avatarCards } from "./playerAvatar";
import { difficultyLabel,unlockedChampions,nextUnlock } from "./soloProgression";
import type { SoloProgression } from "./soloProgression";
import { starterDeckLabel } from "./profileStatistics";
import "./player-profile.css";

const resultLabels={win:"VICTORIA",loss:"DERROTA",draw:"EMPATE"} as const;
type Tab="history"|"decks"|"champions";

function dateLabel(value:string) {
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"—":date.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"2-digit"});
}
function championName(id:string){return champions[id]?championShortName(champions[id].name):"—";}

export default function PlayerProfile({playerName,playerAvatar,onAvatarChange,history,onNameChange,onBack,onPlay,progression}:{
  progression:SoloProgression;
  playerName:string;playerAvatar:string;onAvatarChange:(id:string)=>void;history:MatchRecord[];onNameChange:(next:string)=>void;onBack:()=>void;onPlay:()=>void;
}) {
  const [tab,setTab]=useState<Tab>("history");
  const [name,setName]=useState(playerName===DEFAULT_PLAYER_NAME?"":playerName);
  const [decks]=useState(readDeckLibrary);
  const stats=useMemo(()=>profileStatistics(history,decks),[history,decks]);
  const {summary}=stats;
  const mostPlayed=stats.championRows.find(row=>row.total>0);
  const clean=cleanPlayerName(name).trim();
  const stored=playerName===DEFAULT_PLAYER_NAME?"":playerName;
  return <main className="fo-shell dl-profile">
    <header className="dl-profile-top">
      <button type="button" className="fo-back" onClick={onBack}>← MENÚ PRINCIPAL</button>
      <span className="dl-profile-wordmark">DAGGERLIGHT</span>
      <ThemeToggle compact/>
    </header>
    <section className="dl-profile-heading"><h1>MI PERFIL</h1><button type="button" onClick={onPlay}>JUGAR ↗</button></section>
    <div className="dl-profile-layout">
      <aside className="dl-profile-identity">
        <div className="dl-profile-avatar">
          <PlayerAvatar id={playerAvatar}/>
        </div>
        <form className="dl-profile-name" onSubmit={e=>{e.preventDefault();onNameChange(clean);setName(clean);}}>
          <label htmlFor="dl-player-name">NOMBRE DE JUGADOR</label>
          <input id="dl-player-name" value={name} maxLength={20} onChange={e=>setName(e.target.value)} autoComplete="nickname"/>
          <button type="submit" disabled={clean===stored}>GUARDAR</button>
        </form>
        <section className="dl-avatar-picker-section" aria-label="Elegir avatar">
          <span className="dl-avatar-picker-label">AVATAR</span>
          <div className="dl-avatar-picker">
            {avatarCards.map(card=><button type="button" key={card.id} title={card.name} aria-label={card.name} aria-pressed={playerAvatar===card.id} onClick={()=>onAvatarChange(card.id)}><PlayerAvatar id={card.id}/></button>)}
          </div>
        </section>
        {mostPlayed&&<div className="dl-profile-featured"><small>CAMPEÓN MÁS UTILIZADO</small><strong>{mostPlayed.name}</strong></div>}
        <div className="dl-profile-featured"><small>MAZOS DESBLOQUEADOS</small><strong>{unlockedChampions(progression).length}/9</strong>{nextUnlock(progression)&&<small>Próximo: {starterDeckLabel(nextUnlock(progression)!)}</small>}</div>
        <p className="dl-profile-note">Datos locales de este navegador.</p>
      </aside>
      <section className="dl-profile-main">
        <div className="dl-profile-score" aria-label="Estadísticas generales">
          {[[summary.total,"PARTIDAS"],[summary.wins,"VICTORIAS"],[summary.losses,"DERROTAS"],[summary.draws,"EMPATES"],[summary.total?summary.winRate+"%":"—","VICTORIAS %"]].map(([value,label])=>
            <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <div className="dl-profile-tabs" role="tablist" aria-label="Estadísticas">
          {([["history","HISTORIAL"],["decks","MAZOS"],["champions","CAMPEONES"]] as const).map(([id,label])=>
            <button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}
        </div>
        <div className="dl-profile-scroll" role="tabpanel" aria-label={tab==="history"?"Historial":tab==="decks"?"Mazos":"Campeones"}>
          {tab==="history" && (stats.recent.length?<div className="dl-profile-history">
            {stats.recent.map(record=><article className="dl-profile-match" key={record.id}>
              <span className={"dl-profile-result result-"+record.result}>{resultLabels[record.result]}</span>
              <div className="dl-profile-match-deck"><strong>{deckDisplayName(record.deckId,record.deckName,record.championId,decks)}</strong><small>{championName(record.championId)} vs. {championName(record.opponentId)}</small></div>
              <div className="dl-profile-match-score"><strong>{Number.isFinite(record.finalLife)?record.finalLife:"—"} : {Number.isFinite(record.opponentLife)?record.opponentLife:"—"}</strong><small>{record.mode==="arcade"?"Arcade":"IA"} · {difficultyLabel(record.difficulty)}</small></div>
              <time>{dateLabel(record.finishedAt)}</time>
            </article>)}
          </div>:<div className="dl-profile-empty">Todavía no hay partidas registradas.</div>)}
          {tab==="decks" && <>
            {stats.deckRows.length?<div className="dl-profile-table">
              <div className="dl-profile-table-head"><span>MAZO</span><span>P</span><span>V</span><span>D</span><span>E</span><span>% V</span></div>
              {stats.deckRows.map(row=><div className="dl-profile-table-row" key={row.id}>
                <div className="dl-profile-row-name">{champions[row.championId]&&<FactionCardBack faction={champions[row.championId].faction}/>}<strong>{row.name}</strong></div>
                <span>{row.total}</span><span>{row.wins}</span><span>{row.losses}</span><span>{row.draws}</span><span>{row.total?row.winRate+"%":"—"}</span>
              </div>)}
            </div>:<div className="dl-profile-empty">Todavía no hay estadísticas por mazo.</div>}
            {stats.unassigned>0&&<p className="dl-profile-note">{stats.unassigned} partidas anteriores sin identificador de mazo.</p>}
          </>}
          {tab==="champions" && <div className="dl-profile-table">
            <div className="dl-profile-table-head"><span>CAMPEÓN</span><span>P</span><span>V</span><span>D</span><span>E</span><span>% V</span></div>
            {stats.championRows.map(row=><div className="dl-profile-table-row" key={row.id}>
              <div className="dl-profile-row-name"><span className="dl-profile-portrait"><img src={championImageUrl(row.id,true)} alt=""/></span><div><strong>{row.name}</strong><small>{factionLabels[row.faction]}</small></div></div>
              <span>{row.total}</span><span>{row.wins}</span><span>{row.losses}</span><span>{row.draws}</span><span>{row.total?row.winRate+"%":"—"}</span>
            </div>)}
          </div>}
        </div>
        <p className="dl-profile-footnote">Últimas 250 partidas guardadas · P: partidas · V: victorias · D: derrotas · E: empates</p>
      </section>
    </div>
  </main>;
}
