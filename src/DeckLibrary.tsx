import { useMemo, useState, type CSSProperties } from "react";
import { allCards, factionLabels } from "./data";
import { champions } from "./engine/champions";
import { makeMonoDeckDefinition, proposedMultifactionRules, validateDeck } from "./engine/decks";
import type { DeckDefinition } from "./engine/decks";
import type { AIDifficulty } from "./engine/types";
import type { CardDefinition, Faction } from "./types";
import { championBackgroundUrl, championImageUrl, championShortName } from "./championArtwork";
import { cardSpriteBackground, useCardArtReady } from "./cardArtwork";
import { FactionCardBack } from "./FactionCardBack";
import {
  DECK_LIBRARY_LIMIT, DECK_NAME_MAX, cleanDeckName, makeLibraryDeck,
  readDeckLibrary, writeDeckLibrary
} from "./deckLibraryStorage";
import type { LibraryDeck } from "./deckLibraryStorage";
import ThemeToggle from "./ThemeToggle";
import "./deck-library.css";

const factions: Faction[] = ["red","blue","white","saints","ivory"];
const championIds = Object.keys(champions);
const starterDecks = championIds.map(makeMonoDeckDefinition);
const initialSelection = "starter:" + championIds[0];

type DeckSelection = string;
type Editor = {
  id?: string;
  name: string;
  championId: string;
  secondary: Faction | null;
  selectedIds: string[];
};
type Props = {
  onBack: () => void;
  onPlay: (deck: DeckDefinition, opponentId: string, difficulty: AIDifficulty) => void;
};

function labelFor(deck: DeckDefinition): string {
  const info = validateDeck(deck);
  return info.factions.map(f => factionLabels[f]).join(" / ");
}

function DeckTile({deck, active, starter, favorite, onSelect, onFavorite}:{
  deck: DeckDefinition; active: boolean; starter: boolean; favorite: boolean;
  onSelect:()=>void; onFavorite?:()=>void;
}) {
  const champ = champions[deck.championId];
  const factionsInDeck = validateDeck(deck).factions;
  return <article className={"dl-deck-tile-wrap theme-" + champ.faction + (active?" is-active":"")}>
    <button type="button" className="dl-deck-tile" onClick={onSelect}
      aria-pressed={active} aria-label={deck.name + ". " + championShortName(champ.name)}>
      <span className="dl-deck-tile-art">
        <span className="dl-deck-tile-backdrop" style={{backgroundImage:"url(" + championBackgroundUrl(champ.faction) + ")"}}/>
        <img src={championImageUrl(champ.id)} alt="" loading="lazy"/>
        <span className="dl-deck-tile-frame" aria-hidden="true"/>
        <span className="dl-deck-tile-index">{starter?"MAZO INICIAL":"PERSONALIZADO"}</span>
        <span className="dl-deck-tile-count">24 <small>CARTAS</small></span>
      </span>
      <span className="dl-deck-tile-copy">
        <strong>{deck.name}</strong>
        <small>{championShortName(champ.name)}</small>
        <span className="dl-deck-tile-factions">{factionsInDeck.map(f=>
          <span key={f} className={"dl-deck-faction-dot theme-" + f} title={factionLabels[f]}/>)}
          {labelFor(deck)}
        </span>
      </span>
    </button>
    {!starter && onFavorite && <button type="button"
      className={"dl-deck-favorite" + (favorite?" is-favorite":"")}
      aria-label={favorite?"Quitar de favoritos":"Marcar como favorito"}
      aria-pressed={favorite} title={favorite?"Quitar de favoritos":"Marcar como favorito"}
      onClick={onFavorite}>{favorite?"★":"☆"}</button>}
  </article>;
}

function DeckCardPicker({card,selected,canAdd,onToggle,onPreview}:{
  card:CardDefinition;selected:boolean;canAdd:boolean;onToggle:()=>void;onPreview:()=>void
}) {
  const loaded = useCardArtReady(card);
  const art:CSSProperties | undefined = loaded && card.art ? {
    backgroundImage:cardSpriteBackground(card),
    backgroundSize:"300% 200%",
    backgroundPosition:(card.art.column*50)+"% "+(card.art.row*100)+"%"
  }:undefined;
  return <button type="button" className={"dl-build-card theme-"+card.faction+(selected?" is-picked":"")}
    aria-pressed={selected} disabled={!selected&&!canAdd} onClick={onToggle}
    onMouseEnter={onPreview} onFocus={onPreview}
    title={card.text}>
    <span className="dl-build-card-art" style={art}>
      {!art && <span className="dl-build-card-art-fallback">✧</span>}
      <span className="dl-build-card-counter">{selected?"2/2":"+"}</span>
    </span>
    <span className="dl-build-card-copy">
      <small>{card.studioId} · {card.power} PODER</small>
      <strong>{card.name}</strong>
      <span>{card.text}</span>
    </span>
  </button>;
}

export default function DeckLibrary({onBack,onPlay}:Props) {
  const [decks,setDecks] = useState<LibraryDeck[]>(readDeckLibrary);
  const [selected,setSelected] = useState<DeckSelection>(() => {
    const current = readDeckLibrary();
    const favored = current.find(d => d.favorite) ?? current[0];
    return favored ? "saved:"+favored.id : initialSelection;
  });
  const [editor,setEditor] = useState<Editor|null>(null);
  const [filter,setFilter] = useState<Faction|"all">("all");
  const [search,setSearch] = useState("");
  const [cardSearch,setCardSearch] = useState("");
  const [rival,setRival] = useState("random");
  const [difficulty,setDifficulty] = useState<AIDifficulty>("normal");
  const [deleteId,setDeleteId] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const [deckView,setDeckView] = useState<"saved"|"starter">(() => readDeckLibrary().length ? "saved" : "starter");
  const [buildTab,setBuildTab] = useState<"cards"|"deck">("cards");
  const [manageOpen,setManageOpen] = useState(false);
  const [previewCard,setPreviewCard] = useState<CardDefinition|null>(null);

  const current = selected.startsWith("saved:")
    ? decks.find(d => d.id === selected.slice(6)) ?? starterDecks[0]
    : starterDecks.find(d => d.championId === selected.slice(8)) ?? starterDecks[0];
  const savedCurrent = decks.find(d => d.id === current.id);
  const currentChampion = champions[current.championId];

  function persist(next: LibraryDeck[], notice: string):boolean {
    if (!writeDeckLibrary(next)) {
      setMessage("No se pudo guardar. Revisá el espacio o los permisos de almacenamiento del navegador.");
      return false;
    }
    setDecks(next);
    setMessage(notice);
    return true;
  }

  function openEditor(deck?:DeckDefinition, existing?:LibraryDeck) {
    const base=deck??makeMonoDeckDefinition(championIds[0]);
    const primary=champions[base.championId].faction;
    const secondary=validateDeck(base).factions.find(f=>f!==primary)??null;
    setEditor({
      id:existing?.id,name:existing?.name??"",
      championId:base.championId,secondary,
      selectedIds:[...new Set(base.cardIds)]
    });
    setCardSearch("");
    setBuildTab("cards");
    setPreviewCard(null);
    setDeleteId(null);
    setMessage("");
    window.scrollTo({top:0,behavior:"auto"});
  }

  function saveEditor() {
    if (!editor) return;
    if (decks.length >= DECK_LIBRARY_LIMIT && !editor.id) {
      setMessage("Llegaste al límite de "+DECK_LIBRARY_LIMIT+" mazos guardados.");
      return;
    }
    const base = decks.find(d=>d.id===editor.id);
    const deck: DeckDefinition = {
      id:editor.id??"draft",
      name:cleanDeckName(editor.name),
      championId:editor.championId,
      cardIds:allCards.filter(c=>editor.selectedIds.includes(c.id)).flatMap(c=>[c.id,c.id])
    };
    if (!deck.name || !validateDeck(deck).valid) {
      setMessage("Completá el nombre y las 12 cartas válidas antes de guardar.");
      return;
    }
    const value=makeLibraryDeck(deck,base);
    const next=base?decks.map(d=>d.id===base.id?value:d):[value,...decks];
    if (persist(next,base?"Cambios guardados en tu biblioteca.":"Nuevo mazo guardado.")) {
      setSelected("saved:"+value.id);
      setDeckView("saved");
      setEditor(null);
      setFilter("all");
      setSearch("");
    }
  }

  function favoriteDeck(id:string) {
    persist(decks.map(deck=>({...deck,favorite:deck.id===id?!deck.favorite:false})),
      "Mazo preferido actualizado.");
  }

  function duplicateDeck(deck:DeckDefinition) {
    if (decks.length >= DECK_LIBRARY_LIMIT) {
      setMessage("Llegaste al límite de "+DECK_LIBRARY_LIMIT+" mazos.");
      return;
    }
    const entry=makeLibraryDeck({...deck,name:cleanDeckName(deck.name+" · Copia")});
    if(persist([entry,...decks],"Mazo duplicado. Podés editarlo y cambiarle el nombre.")) {
      setSelected("saved:"+entry.id);
      setDeckView("saved");
    }
  }

  function removeDeck(id:string) {
    const next=decks.filter(x=>x.id!==id);
    if (persist(next,"Mazo eliminado de la biblioteca.")) {
      if (selected==="saved:"+id) {
        setSelected(next.length?"saved:"+next[0].id:initialSelection);
        if(!next.length)setDeckView("starter");
      }
      setDeleteId(null);
    }
  }

  function selectDeck(id:string) {
    setManageOpen(false);
    setSelected(id);
    setDeleteId(null);
    setMessage("");
    // The selection inspector stays visible; never jump the whole screen on mobile.
  }

  const visibleSaved = decks.filter(d=>(filter==="all"||validateDeck(d).factions.includes(filter)) &&
    (d.name+" "+champions[d.championId].name).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const visibleStarters = starterDecks.filter(d=>(filter==="all"||champions[d.championId].faction===filter) &&
    (d.name+" "+champions[d.championId].name).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const sortedSaved=[...visibleSaved].sort((a,b)=>Number(b.favorite)-Number(a.favorite));
  const rules=proposedMultifactionRules;

  if (editor) {
    const activeEditor = editor;
    const champ=champions[editor.championId];
    const chosen=editor.selectedIds;
    const recipe:DeckDefinition={
      id:editor.id??"draft",name:editor.name,championId:editor.championId,
      cardIds:allCards.filter(card=>chosen.includes(card.id)).flatMap(card=>[card.id,card.id])
    };
    const validation=validateDeck(recipe);
    const pool=allCards.filter(card=>card.faction===champ.faction||card.faction===editor.secondary);
    const visiblePool=pool.filter(card=>(card.name+" "+card.studioId+" "+card.text)
      .toLocaleLowerCase().includes(cardSearch.toLocaleLowerCase()));
    const canSave=Boolean(cleanDeckName(editor.name)) && validation.valid;
    function changeChampion(id:string) {
      setEditor({...activeEditor,championId:id,secondary:null,
        selectedIds:[...new Set(makeMonoDeckDefinition(id).cardIds)]});
      setCardSearch("");
    }
    function changeSecondary(value:string) {
      const secondary=(value||null) as Faction|null;
      setEditor({...activeEditor,secondary,selectedIds:chosen.filter(id=>{
        const card=allCards.find(c=>c.id===id);
        return card?.faction===champ.faction||card?.faction===secondary;
      })});
    }
    function toggle(id:string) {
      const card=allCards.find(c=>c.id===id);
      if(card)setPreviewCard(card);
      if (chosen.includes(id)) setEditor({...activeEditor,selectedIds:chosen.filter(x=>x!==id)});
      else if (chosen.length<rules.distinctCards) setEditor({...activeEditor,selectedIds:[...chosen,id]});
    }
    return <main className="fo-shell dl-lib dl-lib-editor">
      <header className="dl-lib-top">
        <button className="fo-back" onClick={()=>{setEditor(null);setMessage("");}}>← BIBLIOTECA</button>
        <span className="dl-lib-wordmark">DAGGERLIGHT <span>/ FORJA DE MAZOS</span></span>
        <ThemeToggle compact/>
      </header>
      <section className={"dl-build-intro theme-" + champ.faction}>
        <div className="dl-build-hero-copy">
          <span className="dl-lib-eyebrow">FORJA DE MAZOS · REGLAS DEL LABORATORIO MULTIFACCIÓN</span>
          <h1>{editor.id?"EDITAR MAZO":"CREAR MAZO"}<span className="dl-build-rules">24 CARTAS <i/> 12 DISTINTAS <i/> 2 COPIAS</span></h1>
        </div>
        <img className="dl-build-hero-portrait" src={championImageUrl(editor.championId)} alt="" />
      </section>
      <div className="dl-build-mobile-tabs" role="tablist" aria-label="Panel del constructor">
        <button type="button" role="tab" aria-selected={buildTab==="cards"}
          className={buildTab==="cards"?"is-active":""} onClick={()=>setBuildTab("cards")}>COLECCIÓN</button>
        <button type="button" role="tab" aria-selected={buildTab==="deck"}
          className={buildTab==="deck"?"is-active":""} onClick={()=>setBuildTab("deck")}>MI MAZO <span>{chosen.length}/12</span></button>
      </div>
      <div className={"dl-build-layout dl-build-view-"+buildTab}>
        <div className="dl-build-main">
          <section className="dl-build-controls">
            <label className="dl-build-name">
              <span>NOMBRE DEL MAZO</span>
              <input maxLength={DECK_NAME_MAX} value={editor.name}
                placeholder="Dale un nombre a tu estrategia…"
                onChange={e=>setEditor({...activeEditor,name:e.target.value})}/>
            </label>
            <div className="dl-build-choices">
              <label>CHAMPION
                <select value={editor.championId} onChange={e=>changeChampion(e.target.value)}>
                  {championIds.map(id=><option key={id} value={id}>{championShortName(champions[id].name)}</option>)}
                </select>
              </label>
              <label>SEGUNDA FACCIÓN
                <select value={editor.secondary??""} onChange={e=>changeSecondary(e.target.value)}>
                  <option value="">Solo {factionLabels[champ.faction]}</option>
                  {factions.filter(f=>f!==champ.faction).map(f=>
                    <option key={f} value={f}>{factionLabels[f]}</option>)}
                </select>
              </label>
            </div>
          </section>
          <section className="dl-build-collection">
            <div className="dl-build-section-head">
              <div><span className="dl-lib-eyebrow">CARTAS DISPONIBLES</span>
                <h2>Elegí tus doce.</h2></div>
              <input type="search" aria-label="Buscar cartas" placeholder="Buscar cartas..."
                value={cardSearch} onChange={e=>setCardSearch(e.target.value)}/>
            </div>
            <div className="dl-build-quick-actions">
              <span>12 cartas distintas · Dos copias automáticas · Máximo 2 facciones.</span>
              <button type="button" disabled={!chosen.length}
                onClick={()=>setEditor({...activeEditor,selectedIds:[]})}>VACIAR MAZO</button>
            </div>
            <div className="dl-build-card-grid">
              {visiblePool.map(card=><DeckCardPicker key={card.id} card={card}
                selected={chosen.includes(card.id)} canAdd={chosen.length<rules.distinctCards}
                onToggle={()=>toggle(card.id)} onPreview={()=>setPreviewCard(card)}/>)}
            </div>
            {!visiblePool.length && <p className="dl-lib-empty">No hay cartas con ese nombre.</p>}
          </section>
        </div>
        <aside className="dl-build-summary">
          <div className="dl-build-summary-head">
            <span className="dl-lib-eyebrow">TU CONSTRUCCIÓN</span>
            <strong>{chosen.length} <small>/ {rules.distinctCards}</small></strong>
            <span className="dl-build-meter"><span style={{width:((chosen.length/rules.distinctCards)*100)+"%"}}/></span>
            <p>{chosen.length*rules.maxCopies} / {rules.deckSize} cartas</p>
          </div>
          {previewCard && <div className={"dl-build-inspect theme-"+previewCard.faction} aria-live="polite">
            <strong>{previewCard.name} <span>{previewCard.power} PODER</span></strong>
            <p>{previewCard.text}</p>
          </div>}
          <div className="dl-build-summary-cards">
            {chosen.length ? chosen.map((id,index)=>{
              const c=allCards.find(card=>card.id===id);
              return c ? <button key={id} type="button" onClick={()=>toggle(id)}
                className={"dl-build-summary-row theme-"+c.faction}
                aria-label={"Quitar "+c.name}>
                <span>{String(index+1).padStart(2,"0")}</span>
                <strong>{c.name}</strong><small>× 2</small><b>×</b>
              </button>:null;
            }):<p>Empezá eligiendo cartas de la colección.</p>}
          </div>
          <div className="dl-build-validation" role="status">
            <strong>{canSave?"MAZO VÁLIDO":"CONSTRUCCIÓN EN CURSO"}</strong>
            <p>{canSave?"Listo para guardar y jugar.":!cleanDeckName(editor.name)?"Poné un nombre para guardar tu mazo.":validation.errors.join(" · ")}</p>
          </div>
          {message && <p className="dl-lib-feedback" role="status">{message}</p>}
          <button className="dl-lib-primary dl-build-save" type="button" disabled={!canSave}
            onClick={saveEditor}>GUARDAR MAZO <span>↗</span></button>
          <button className="dl-lib-text-action" type="button"
            onClick={()=>{setEditor(null);setMessage("");}}>CANCELAR</button>
        </aside>
      </div>
      <div className="dl-build-mobile-dock">
        <button type="button" onClick={()=>setBuildTab(buildTab==="cards"?"deck":"cards")}
          aria-label={buildTab==="cards"?"Ver cartas seleccionadas":"Volver a la colección"}>
          {buildTab==="cards"?"VER MI MAZO":"VER CARTAS"} · {chosen.length}/12
        </button>
        <button type="button" className="dl-lib-primary" disabled={!canSave}
          onClick={saveEditor}>GUARDAR MAZO ↗</button>
      </div>
    </main>;
  }

  return <main className="fo-shell dl-lib dl-lib-selection">
    <header className="dl-lib-top">
      <button className="fo-back" onClick={onBack}>← MENÚ PRINCIPAL</button>
      <span className="dl-lib-wordmark">DAGGERLIGHT <span>/ BIBLIOTECA</span></span>
      <ThemeToggle compact/>
    </header>

    <section className="dl-lib-banner">
      <div className="dl-lib-banner-copy">
        <span className="dl-lib-eyebrow">DAGGERLIGHT · TU ARSENAL</span>
        <h1>ELEGÍ TU MAZO <em>✦</em></h1>
        <p>{decks.length} personalizados · 9 iniciales · Una estrategia para cada duelo.</p>
      </div>
      <div className="dl-lib-banner-visual" aria-hidden="true">
        <img src={championImageUrl(current.championId)} alt=""/>
      </div>
      <button className="dl-lib-primary dl-lib-banner-new" onClick={()=>openEditor()}>
        <span className="dl-lib-button-plus">＋</span> CREAR MAZO <span>↗</span>
      </button>
    </section>

    <div className="dl-lib-layout">
      <section className="dl-lib-collection" aria-label="Seleccionar mazo">
        <div className="dl-lib-deck-tabs" role="tablist" aria-label="Tipo de mazo">
          <button type="button" role="tab" aria-selected={deckView==="saved"}
            className={deckView==="saved"?"is-selected":""} onClick={()=>setDeckView("saved")}>
            MIS MAZOS <span>{decks.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={deckView==="starter"}
            className={deckView==="starter"?"is-selected":""} onClick={()=>setDeckView("starter")}>
            MAZOS INICIALES <span>9</span>
          </button>
          <span className="dl-lib-deck-count">{decks.length}/{DECK_LIBRARY_LIMIT} GUARDADOS</span>
        </div>
        <div className="dl-lib-toolbar">
          <label className="dl-lib-search">
            <span className="dl-lib-sr-only">Buscar mazos</span>
            <input type="search" placeholder="Buscar por mazo o Champion..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </label>
          <div className="dl-lib-filter" role="group" aria-label="Filtrar mazos por facción">
            <button className={filter==="all"?"is-selected":""} onClick={()=>setFilter("all")} aria-pressed={filter==="all"}>TODOS</button>
            {factions.map(f=><button key={f} title={factionLabels[f]}
              className={"theme-"+f+(filter===f?" is-selected":"")}
              aria-label={"Filtrar por "+factionLabels[f]} aria-pressed={filter===f}
              onClick={()=>setFilter(f)}>{factionLabels[f]}</button>)}
          </div>
        </div>
        <div className="dl-lib-deck-scroll" role="tabpanel" aria-label={deckView==="saved"?"Mazos guardados":"Mazos iniciales"}>
          {deckView==="saved" ?
            sortedSaved.length ? <div className="dl-lib-grid">
              {sortedSaved.map(deck=><DeckTile key={deck.id} deck={deck}
                starter={false} favorite={deck.favorite} active={selected==="saved:"+deck.id}
                onSelect={()=>selectDeck("saved:"+deck.id)}
                onFavorite={()=>favoriteDeck(deck.id)}/>)}
            </div> : <div className="dl-lib-empty-state">
              <span className="dl-lib-empty-glyph" aria-hidden="true">✧</span>
              <strong>{decks.length?"No encontramos mazos con esos filtros.":"Tu próximo mazo te espera."}</strong>
              <p>{decks.length?"Probá otro nombre o facción.":"Creá un mazo propio o usá uno de los nueve iniciales como punto de partida."}</p>
              {!decks.length && <button type="button" onClick={()=>openEditor()}>CREAR MI PRIMER MAZO ↗</button>}
            </div>
          : visibleStarters.length ? <div className="dl-lib-grid">
              {visibleStarters.map(deck=><DeckTile key={deck.id} deck={deck}
                starter favorite={false} active={selected==="starter:"+deck.championId}
                onSelect={()=>selectDeck("starter:"+deck.championId)}/>)}
            </div> : <p className="dl-lib-empty">No hay mazos iniciales con ese filtro.</p>}
        </div>
      </section>

      <aside id="dl-lib-inspector" className={"dl-lib-inspector theme-"+currentChampion.faction}>
        <span className="dl-lib-eyebrow">MAZO SELECCIONADO</span>
        <div className="dl-lib-inspector-art">
          <div className="dl-lib-inspector-back" style={{backgroundImage:"url("+championBackgroundUrl(currentChampion.faction)+")"}}/>
          <img className="dl-lib-inspector-champion" src={championImageUrl(current.championId)} alt=""/>
          <span className="dl-lib-inspector-card-back"><FactionCardBack faction={currentChampion.faction}/></span>
        </div>
        <div className="dl-lib-inspector-content">
          <span className="dl-lib-deck-kind">{savedCurrent?"TU CREACIÓN":"MAZO INICIAL"}</span>
          <h2>{current.name}</h2>
          <p>{championShortName(currentChampion.name)}</p>
          <div className="dl-lib-inspector-factions">
            {validateDeck(current).factions.map(f=><span className={"dl-lib-inspector-faction theme-"+f} key={f}>{factionLabels[f]}</span>)}
          </div>
          <div className="dl-lib-inspector-stats">
            <span><strong>24</strong><small>CARTAS</small></span>
            <span><strong>12</strong><small>DIFERENTES</small></span>
            <span><strong>{validateDeck(current).factions.length}</strong><small>FACCIONES</small></span>
          </div>
          <div className="dl-lib-match-settings">
            <span className="dl-lib-eyebrow">PREPARAR ENFRENTAMIENTO</span>
            <label>RIVAL
              <select value={rival} onChange={e=>setRival(e.target.value)}>
                <option value="random">Aleatorio</option>
                {championIds.filter(id=>id!==current.championId).map(id=>
                  <option key={id} value={id}>{championShortName(champions[id].name)}</option>)}
              </select>
            </label>
            <label>DIFICULTAD
              <select value={difficulty} onChange={e=>setDifficulty(e.target.value as AIDifficulty)}>
                <option value="easy">Aprendiz · Fácil</option>
                <option value="normal">Estratega · Normal</option>
                <option value="hard">Maestro · Difícil</option>
              </select>
            </label>
          </div>
          {deleteId===current.id && savedCurrent && <div className="dl-lib-delete" role="alert">
            <strong>¿Eliminar «{current.name}»?</strong>
            <p>Esta acción no se puede deshacer.</p>
            <div><button type="button" onClick={()=>setDeleteId(null)}>CANCELAR</button>
              <button type="button" onClick={()=>removeDeck(current.id)}>ELIMINAR MAZO</button></div>
          </div>}
          {message && <p className="dl-lib-feedback" role="status">{message}</p>}
          <p className="dl-lib-storage-note">Reglas multifacción del laboratorio · Guardado local en este navegador.</p>
        </div>
        <div className="dl-lib-inspector-footer">
          <button className="dl-lib-primary dl-lib-play" type="button"
            onClick={()=>onPlay(current,rival===current.championId?"random":rival,difficulty)}>
            JUGAR CON ESTE MAZO <span>↗</span>
          </button>
          <div className={"dl-lib-inspector-actions"+(manageOpen?" is-open":"")}>
            <button type="button" onClick={()=>openEditor(current,savedCurrent)}>
              {savedCurrent?"EDITAR":"CREAR A PARTIR DE ESTE"}
            </button>
            {savedCurrent && <button type="button" onClick={()=>duplicateDeck(current)}>DUPLICAR</button>}
            {savedCurrent && <button type="button" onClick={()=>setDeleteId(current.id)}>ELIMINAR</button>}
          </div>
          <button type="button" className="dl-lib-manage-trigger" aria-label="Gestionar mazo"
            aria-expanded={manageOpen} onClick={()=>setManageOpen(value=>!value)}>•••</button>
        </div>
      </aside>
    </div>
  </main>;
}
