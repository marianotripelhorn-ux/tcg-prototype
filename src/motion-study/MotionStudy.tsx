import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { CardFace } from "../App";
import { championBackgroundUrl, championImageUrl, championShortName } from "../championArtwork";
import { byId, positionLabels, positions } from "../data";
import { champions } from "../engine/champions";
import "./motion-study.css";

const asset = (path: string) => import.meta.env.BASE_URL + path;
const scenes = [
  { id: "entry", name: "Entrada", note: "Los Campeones toman posición en la arena.", seconds: 2 },
  { id: "deal", name: "Reparto", note: "El mazo entrega la mano carta por carta.", seconds: 1.4 },
  { id: "inspect", name: "Inspección", note: "La carta se eleva para dejar leer su arte y habilidad.", seconds: 1.45 },
  { id: "place", name: "Colocación", note: "Caballero Tigre ocupa Diestra.", seconds: 1.2 },
  { id: "reply", name: "Respuesta rival", note: "La Criatura Invocada se revela en Siniestra.", seconds: 1.35 },
  { id: "power", name: "Poder", note: "Criatura Invocada gana +2 contra una carta de Poder impreso 6.", seconds: 1.65 },
  { id: "life", name: "Resultado y Vida", note: "El rival gana el duelo. El marcador sube a 0–2 y tu Vida baja a 7.", seconds: 1.55 },
  { id: "decision", name: "Quiero / No quiero", note: "Con la ronda 0–2, podés disputar el tercer duelo.", seconds: 1.55 },
  { id: "archive", name: "Archivo", note: "Las cartas jugadas regresan al Archivo de su posición.", seconds: 1.75 },
  { id: "round", name: "Nueva ronda", note: "Se abre el siguiente turno con una mano nueva.", seconds: 1.7 },
  { id: "finish", name: "Fin de partida", note: "En la última ronda, Vor Calasta gana la partida.", seconds: 2.35 }
] as const;

const hand = [byId("guardia_dextral"), byId("caballero_tigre"), byId("invocadagas")];
const freshHand = [byId("maestro_armas"), byId("corona_eterea"), byId("blazewalker")];
const rivalCard = byId("criatura_invocada");
const back = asset("board/cardback-gold.png");
const crown = asset("board/ivory-ui/vida-crown.webp");
const cardIds = ["hand-left", "hand-pick", "hand-right", "rival"] as const;
type CardId = typeof cardIds[number];
type Scene = typeof scenes[number];
type Pose = { x: number; y: number; scale: number; rotation: number; rotationX: number; rotationY: number; opacity: number };

function Champion({ side, life }: { side: "player" | "rival"; life: number }) {
  const champion = champions[side === "player" ? "dextral" : "sinistral"];
  return <aside className={"ms-champion ms-" + side} data-champion={side}
    style={{ "--ms-fabric": 'url("' + championBackgroundUrl(champion.faction) + '")' } as CSSProperties}>
    <div className="ms-portrait"><img src={championImageUrl(champion.id)} alt="" /></div>
    <div className="ms-champion-name">
      <span>{side === "player" ? "VOS" : "RIVAL"}</span>
      <strong>{championShortName(champion.name)}</strong>
    </div>
    <div className="ms-life" data-life={side} aria-label={"Vida " + life}>
      <img src={crown} alt="" /><b key={life}>{life}</b>
    </div>
  </aside>;
}

function prepareScene(stage: HTMLElement, scene: Scene, timeline: gsap.core.Timeline) {
  const select = gsap.utils.selector(stage);
  const node = (key: string) => stage.querySelector<HTMLElement>('[data-anchor="' + key + '"]')!;
  const origin = stage.getBoundingClientRect();
  const point = (key: string) => {
    const target = key === "player-crown" ? stage.querySelector<HTMLElement>('[data-life="player"]')! : node(key);
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - origin.left, y: rect.top + rect.height / 2 - origin.top };
  };
  const pose = (key: string, changes: Partial<Pose> = {}): Pose => ({
    ...point(key), scale: 1, rotation: 0, rotationX: 0, rotationY: 0, opacity: 1, ...changes
  });
  const handPose = (key: CardId) => pose(key, { scale: .75,
    rotation: key === "hand-left" ? -9 : key === "hand-right" ? 9 : 0 });
  const card = (key: CardId) => select('[data-card="' + key + '"]');
  const label = select(".ms-event");
  const shade = select(".ms-focus");
  const table = select(".ms-table-art");
  const deckPose = pose("deck", { scale: .5, opacity: 0, rotationY: -178 });
  const boardPlayer = pose("player-slot", { scale: .77, rotation: 6 });
  const boardRival = pose("rival-slot", { scale: .77, rotation: -6 });
  const clashPlayer = pose("player-clash", { scale: 1.05, rotation: -9, rotationY: -13 });
  const clashRival = pose("rival-clash", { scale: 1.05, rotation: 9, rotationY: 13 });

  gsap.set(select(".ms-flying-card"), { xPercent: -50, yPercent: -50, transformPerspective: 850 });
  for (const id of cardIds) gsap.set(card(id), deckPose);
  gsap.set([...label, ...shade, ...select(".ms-wave"), ...select(".ms-delta"), ...select(".ms-decision")], { opacity: 0 });
  for (const id of cardIds.slice(0, 3)) {
    if (scene.id !== "entry" && scene.id !== "deal" && scene.id !== "archive" && scene.id !== "round" && scene.id !== "finish") {
      gsap.set(card(id), handPose(id));
    }
  }

  const fly = (id: CardId, destination: Pose, at: number, duration: number, ease = "power3.out") =>
    timeline.to(card(id), { ...destination, duration, ease }, at);
  const announce = (at: number) => timeline.fromTo(label,
    { opacity: 0, y: 26, clipPath: "inset(0 0 100% 0)" },
    { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: .55, ease: "power4.out" }, at);
  const dealCards = (at: number) => cardIds.slice(0, 3).forEach((id, index) => {
    const start = at + index * .12;
    const target = handPose(id);
    fly(id, { ...target, y: target.y - 42, scale: .86, rotationY: -24 }, start, .48, "power2.out");
    fly(id, target, start + .48, .36, "back.out(1.2)");
  });
  const transfer = (source: string, destination: string, at: number, tint: "blue" | "gold" = "blue") => {
    const start = point(source);
    const finish = point(destination);
    const dx = finish.x - start.x;
    const dy = finish.y - start.y;
    const wave = select(".ms-wave");
    gsap.set(wave, { x: start.x, y: start.y, width: Math.hypot(dx, dy),
      rotation: Math.atan2(dy, dx) * 180 / Math.PI, scaleX: 0, opacity: 1,
      "--ms-wave-color": tint === "blue" ? "#a5c7ff" : "#f1d48d" });
    timeline.fromTo(wave, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: .46, ease: "power3.inOut" }, at);
    timeline.to(wave, { opacity: 0, duration: .3, ease: "power2.out" }, at + .47);
  };

  switch (scene.id) {
    case "entry":
      timeline.fromTo(table, { opacity: .3, scale: 1.12 }, { opacity: 1, scale: 1, duration: 1.65, ease: "power3.out" }, 0);
      timeline.fromTo(select(".ms-player"), { opacity: 0, xPercent: -18, clipPath: "inset(0 100% 0 0)" },
        { opacity: 1, xPercent: 0, clipPath: "inset(0 0% 0 0)", duration: 1.04, ease: "power4.out" }, .22);
      timeline.fromTo(select(".ms-rival"), { opacity: 0, xPercent: 18, clipPath: "inset(0 0 0 100%)" },
        { opacity: 1, xPercent: 0, clipPath: "inset(0 0 0 0%)", duration: 1.04, ease: "power4.out" }, .32);
      announce(.96);
      break;
    case "deal":
      dealCards(.1);
      break;
    case "inspect":
      timeline.to(shade, { opacity: .72, duration: .4 }, .02);
      fly("hand-pick", pose("inspect", { scale: 1.65, rotation: -5, rotationY: -10 }), 0, .59, "power4.out");
      fly("hand-pick", pose("inspect", { scale: 1.6, rotation: -2 }), .6, .45);
      break;
    case "place":
      gsap.set(card("hand-pick"), pose("inspect", { scale: 1.6, rotation: -2 }));
      fly("hand-pick", pose("player-slot", { scale: .88, rotation: 13, rotationX: 24 }), .02, .5, "power3.inOut");
      fly("hand-pick", boardPlayer, .52, .22, "back.out(2)");
      timeline.fromTo(select(".ms-lane[data-lane=diestra]"), { "--ms-slot-light": 0 },
        { "--ms-slot-light": 1, duration: .11, yoyo: true, repeat: 1 }, .48);
      break;
    case "reply":
      gsap.set(card("hand-pick"), boardPlayer);
      gsap.set(card("rival"), pose("rival-deck", { scale: .5, rotationY: 172 }));
      fly("rival", pose("rival-slot", { scale: .9, rotation: -13, rotationY: 38 }), .05, .56, "power3.out");
      fly("rival", boardRival, .61, .29, "back.out(1.45)");
      break;
    case "power":
      gsap.set(card("hand-pick"), boardPlayer);
      gsap.set(card("rival"), boardRival);
      timeline.to(shade, { opacity: .62, duration: .44 }, 0);
      fly("hand-pick", clashPlayer, .1, .55, "power3.inOut");
      fly("rival", clashRival, .13, .55, "power3.inOut");
      transfer("rival-slot", "rival-clash", .51);
      timeline.fromTo(select(".ms-delta"), { opacity: 0, y: 20, scale: .7 },
        { opacity: 1, y: 0, scale: 1, duration: .38, ease: "back.out(1.45)" }, .87);
      break;
    case "life":
      gsap.set(card("hand-pick"), clashPlayer);
      gsap.set(card("rival"), clashRival);
      gsap.set(shade, { opacity: .57 });
      fly("hand-pick", { ...clashPlayer, rotation: -16, scale: .93 }, .25, .18, "power2.out");
      transfer("rival-clash", "player-crown", .24);
      timeline.fromTo(select("[data-life=player]"), { scale: 1 },
        { scale: 1.17, duration: .16, yoyo: true, repeat: 1, ease: "power2.out" }, .68);
      timeline.fromTo(select(".ms-score"), { scale: .94, opacity: .56 },
        { scale: 1, opacity: 1, duration: .34, ease: "back.out(1.8)" }, .68);
      timeline.to(shade, { opacity: 0, duration: .42 }, .68);
      fly("hand-pick", boardPlayer, .74, .48);
      fly("rival", boardRival, .74, .48);
      announce(.78);
      break;
    case "decision":
      gsap.set(card("hand-pick"), boardPlayer);
      gsap.set(card("rival"), boardRival);
      timeline.to(shade, { opacity: .68, duration: .42 }, 0);
      timeline.fromTo(select(".ms-decision"), { opacity: 0, y: 40, rotationX: -26 },
        { opacity: 1, y: 0, rotationX: 0, duration: .7, ease: "power4.out" }, .16);
      break;
    case "archive":
      gsap.set(card("hand-pick"), boardPlayer);
      gsap.set(card("rival"), boardRival);
      fly("rival", { ...boardRival, scale: .89, rotation: -16, y: boardRival.y - 25 }, .12, .32);
      fly("hand-pick", { ...boardPlayer, scale: .89, rotation: 16, y: boardPlayer.y - 25 }, .24, .32);
      transfer("player-slot", "player-archive", .51, "gold");
      fly("rival", pose("rival-archive", { scale: .24, rotationY: 88, opacity: 0 }), .44, .38, "power3.in");
      fly("hand-pick", pose("player-archive", { scale: .24, rotationY: -88, opacity: 0 }), .56, .38, "power3.in");
      timeline.fromTo(select(".ms-archive strong"), { opacity: .35, y: 5 },
        { opacity: 1, y: 0, duration: .4, stagger: .12, ease: "power3.out" }, .82);
      announce(.88);
      break;
    case "round":
      timeline.fromTo(table, { scale: 1.06 }, { scale: 1, duration: 1.35, ease: "power3.out" }, .03);
      announce(.12);
      dealCards(.56);
      break;
    case "finish":
      timeline.to(shade, { opacity: .8, duration: .85 }, 0);
      timeline.to(select(".ms-player"), { opacity: .32, xPercent: -4, duration: .72 }, 0);
      timeline.fromTo(select(".ms-rival .ms-portrait img"), { scale: 1 }, { scale: 1.13, duration: 1.8, ease: "power2.out" }, .14);
      announce(.52);
      break;
  }
}

export default function MotionStudy() {
  const stage = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"still" | "scene" | "sequence">("still");
  const [step, setStep] = useState(0);
  const [take, setTake] = useState(0);
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [acceptedDuel, setAcceptedDuel] = useState(false);
  const [stateRevealed, setStateRevealed] = useState(true);
  const scene = scenes[step];
  const final = scene.id === "finish";
  const newRound = scene.id === "round";
  const archive = scene.id === "archive";
  const payout = scene.id === "life";
  const spent = step > 6 || payout && stateRevealed;
  const round = final ? 5 : newRound ? 3 : 2;
  const life = final ? 0 : spent ? 7 : 8;
  const score = final || newRound ? "0–0" : spent ? "0–2" : "0–1";
  const displayedHand = newRound ? freshHand : hand;

  function navigate(index: number, nextMode: typeof mode) {
    setStep(index);
    setMode(nextMode);
    setAcceptedDuel(false);
    setStateRevealed(nextMode === "still" || reduced);
    setTake(value => value + 1);
  }

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const field = stage.current;
    if (!field) return;
    let timeline: gsap.core.Timeline | undefined;
    const context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true });
      prepareScene(field, scene, timeline);
      timeline.to({}, { duration: scene.seconds }, 0);
      timeline.call(() => setStateRevealed(true), [], scene.id === "life" ? .68 : scene.id === "archive" ? .95 : .91);
      timeline.eventCallback("onComplete", () => {
        if (mode === "sequence" && step < scenes.length - 1) {
          setAcceptedDuel(false);
          setStateRevealed(reduced);
          setStep(step + 1);
        } else {
          setMode("still");
        }
      });
      if (mode === "still" || reduced) timeline.progress(1, true);
      else timeline.play(0);
    }, field);

    let timeout: number | undefined;
    if (mode !== "still" && reduced) {
      timeout = window.setTimeout(() => {
        if (mode === "sequence" && step < scenes.length - 1) setStep(step + 1);
        else setMode("still");
      }, scene.seconds * 1000);
    }
    return () => {
      window.clearTimeout(timeout);
      context.revert();
    };
  }, [scene, step, mode, take, reduced]);

  useEffect(() => {
    const field = stage.current;
    if (!field) return;
    let size = field.getBoundingClientRect();
    const resize = new ResizeObserver(() => {
      const next = field.getBoundingClientRect();
      if (Math.abs(next.width - size.width) < 1 && Math.abs(next.height - size.height) < 1) return;
      size = next;
      setTake(value => value + 1);
    });
    resize.observe(field);
    return () => resize.disconnect();
  }, []);

  const eventTitle = scene.id === "entry" ? "DAGGERLIGHT" :
    payout ? "DERROTA EN EL DUELO" : archive ? "ARCHIVOS" : newRound ? "RONDA 3" : final ? "DERROTA" : "";
  const eventDetail = scene.id === "entry" ? "Majestad Carmesi · Vor Calasta" : payout ? "6 — 8" :
    archive ? "SINIESTRA · DIESTRA" : final ? "VOR CALASTA GANA LA PARTIDA" : "";

  return <main className="motion-study">
    <header className="ms-header">
      <div><strong>DAGGERLIGHT</strong><span>ESTUDIO DE MOVIMIENTO</span></div>
      <a href={import.meta.env.BASE_URL}>Volver al juego</a>
    </header>
    <section ref={stage} className="ms-stage" aria-label="Arena de la partida de muestra"
      data-scene={scene.id} data-playback={mode}
      style={{ "--ms-table": 'url("' + asset("board/ivory-ui/arena-ivory-limestone.webp") + '")' } as CSSProperties}>
      <div className="ms-table-art" aria-hidden="true" />
      <div className="ms-lanes" aria-label="Posiciones del tablero">
        {positions.map(position => <div key={position} className="ms-lane" data-lane={position}>
          <div className="ms-slot" data-anchor={position === "siniestra" ? "rival-slot" : undefined}/>
          <span>{positionLabels[position]}</span>
          <div className="ms-slot" data-anchor={position === "diestra" ? "player-slot" : undefined}/>
          <div className="ms-archive" data-anchor={position === "siniestra" ? "rival-archive" : position === "diestra" ? "player-archive" : undefined}>
            <small>ARCHIVO</small><strong>{position !== "trono" && (archive && stateRevealed || newRound || final) ? 1 : 0}</strong>
          </div>
        </div>)}
      </div>
      <div className="ms-score"><span>RONDA {round}</span><strong>{score}</strong></div>
      <Champion side="player" life={life}/>
      <Champion side="rival" life={final ? 3 : 9}/>
      
      <div className="ms-anchor ms-rival-deck" data-anchor="rival-deck"/>
      <div className="ms-anchor ms-inspect" data-anchor="inspect"/>
      <div className="ms-anchor ms-clash-player" data-anchor="player-clash"/>
      <div className="ms-anchor ms-clash-rival" data-anchor="rival-clash"/>
      <div className="ms-hand-targets" aria-hidden="true">
        {cardIds.slice(0, 3).map(id => <i key={id} data-anchor={id}/>)}
      </div>
      <div className="ms-deck" data-anchor="deck"><img src={back} alt="Mazo" /></div>
      <div className="ms-focus" aria-hidden="true"/>
      <div className="ms-wave" aria-hidden="true"/>
      {[...displayedHand, rivalCard].map((definition, index) =>
        <div key={cardIds[index]} className="ms-flying-card" data-card={cardIds[index]}>
          <div className="ms-card-face">
            <CardFace card={definition}
              livePower={(index === 1 || index === 3) && (scene.id === "power" || scene.id === "life")}
              finalPower={index === 3 && (step > 5 || step === 5 && stateRevealed) ? 8 : undefined}/>
          </div>
          <img src={back} alt="" className="ms-card-back"/>
        </div>
      )}
      {scene.id === "power" && <strong className="ms-delta">+2</strong>}
      <div className="ms-event" aria-hidden="true">
        <strong>{eventTitle}</strong>
        {!!eventDetail && <span>{eventDetail}</span>}
      </div>
      {scene.id === "decision" && <div className="ms-decision">
        <strong key={String(acceptedDuel)}>{acceptedDuel ? "Continúa el duelo" : "¿Disputar el tercer duelo?"}</strong>
        <div>
          <button type="button" onClick={() => { setMode("still"); setAcceptedDuel(true); }} aria-pressed={acceptedDuel}>Quiero</button>
          <button type="button" onClick={() => navigate(8, "scene")}>No quiero</button>
        </div>
      </div>}
    </section>
    <section className="ms-controls" aria-label="Controles del estudio">
      <div className="ms-caption" aria-live="polite">
        <h1>{scene.name}</h1>
        <p>{scene.note}</p>
      </div>
      <div className="ms-playback">
        <button type="button" onClick={() => navigate(step, "scene")}>Repetir escena</button>
        <button type="button" className="ms-primary" onClick={() => mode === "sequence" ? navigate(step, "still") : navigate(0, "sequence")}>
          {mode === "sequence" ? "Detener" : "Reproducir todo"}
        </button>
      </div>
      <nav className="ms-chapters" aria-label="Escenas de la partida de muestra">
        {scenes.map(({ id, name }, index) => <button key={id} type="button" onClick={() => navigate(index, "scene")}
          aria-current={step === index ? "step" : undefined}>{name}</button>)}
      </nav>
    </section>
  </main>;
}
