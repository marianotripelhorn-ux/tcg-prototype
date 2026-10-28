import { useEffect, useState } from "react";
import "./tutorial.css";

type TutorialProps = {
  onClose: () => void;
  onPlay: () => void;
  inGame: boolean;
};

const screens = [
  { kicker: "01 · TU MISIÓN", title: "Ganás cuando el Champion rival se queda sin Vida", body: "Cada Champion empieza con 9 puntos de Vida. Cada duelo que ganás le quita 1 punto al rival. No hay maná: tu desafío es elegir bien tus tres cartas." },
  { kicker: "02 · EL COMBATE", title: "Una carta contra otra", body: "Un jugador abre el duelo y el otro responde después de ver su carta y posición. Se comparan los Poderes finales. El mayor gana; si son iguales, nadie pierde Vida." },
  { kicker: "03 · LAS POSICIONES", title: "La posición puede cambiar tu jugada", body: "Podés jugar en Siniestra, Trono o Diestra. Algunas habilidades solo funcionan en una posición concreta. Probalo con Invocadagas." },
  { kicker: "04 · LA RONDA", title: "Pensá en el orden de tus tres cartas", body: "Al comenzar cada ronda recibís 3 cartas. Quien gana un duelo abre el siguiente; en empate conserva la iniciativa quien abrió. Las habilidades pueden preparar tu próxima carta." },
  { kicker: "05 · QUIERO / NO QUIERO", title: "Cuando vas 0–2, decidís el riesgo", body: "Si perdés los dos primeros duelos, podés jugar el tercero para intentar ganar 1 punto o decir «No quiero» y cerrar la ronda. No hay puntos extra por ganar la ronda." },
  { kicker: "06 · EL ARCHIVO", title: "Las cartas jugadas dejan huella", body: "Al final de cada ronda, las cartas que jugaste se guardan en el Archivo de su posición. Solo importa cuántas hay en cada Archivo; algunos efectos se hacen más fuertes con esos números." },
  { kicker: "07 · TU PRIMERA PARTIDA", title: "Ya conocés lo necesario para empezar", body: "Elegí un Champion, mirá las tres cartas de tu mano, inspeccioná sus habilidades y decidí el orden y las posiciones. Podés volver a esta guía cuando quieras." }
];

export default function Tutorial({ onClose, onPlay, inGame }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<"siniestra" | "trono" | "diestra" | null>(null);
  const [duelResolved, setDuelResolved] = useState(false);
  const [quiero, setQuiero] = useState<"quiero" | "no" | null>(null);
  const [archived, setArchived] = useState(false);
  const current = screens[step];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="tutorial-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-description">
        <div className="tutorial-top">
          <span className="tutorial-brand"><span aria-hidden="true">✦</span> DAGGERLIGHT <b>ACADEMIA</b></span>
          <button className="tutorial-close" type="button" onClick={onClose} aria-label="Cerrar tutorial">×</button>
        </div>

        <div className="tutorial-progress" aria-label={"Paso " + (step + 1) + " de " + screens.length}>
          {screens.map((screen, index) => (
            <button key={screen.kicker} type="button" className={"tutorial-progress-dot" + (index <= step ? " is-reached" : "") + (index === step ? " is-current" : "")} onClick={() => setStep(index)} aria-label={"Ir al paso " + (index + 1)} aria-current={step === index ? "step" : undefined} />
          ))}
        </div>

        <div className="tutorial-copy" key={step}>
          <span className="tutorial-kicker">{current.kicker}</span>
          <h2 id="tutorial-title">{current.title}</h2>
          <p id="tutorial-description">{current.body}</p>
        </div>

        <div className="tutorial-exercise" aria-label="Ejemplo interactivo">
          {step === 0 && (
            <div className="tutorial-intro">
              <div className="tutorial-life-group">
                <div><span className="tutorial-eyebrow">TU CHAMPION</span><strong>9 <span>♥</span></strong><small>Vida</small></div>
                <div className="tutorial-versus">VS</div>
                <div><span className="tutorial-eyebrow">CHAMPION RIVAL</span><strong>9 <span>♥</span></strong><small>Vida</small></div>
              </div>
              <div className="tutorial-stat-row"><span><b>3</b> cartas por ronda</span><span><b>3</b> posiciones</span><span><b>1</b> daño por victoria</span></div>
            </div>
          )}
          {step === 1 && (
            <div className="tutorial-duel">
              <div className="tutorial-duel-cards">
                <div className="tutorial-demo-card"><span>TU CARTA</span><strong>7</strong><small>INVOCADAGAS</small></div>
                <span className="tutorial-vs">VS</span>
                <div className="tutorial-demo-card enemy"><span>RIVAL</span><strong>5</strong><small>GUARDIA</small></div>
              </div>
              {duelResolved ? <div className="tutorial-feedback correct" role="status">Ganaste el duelo: el rival pierde 1 Vida (9 → 8).</div> : <button type="button" className="tutorial-try" onClick={() => setDuelResolved(true)}>COMPARAR PODERES</button>}
            </div>
          )}
          {step === 2 && (
            <div className="tutorial-placement">
              <div className="tutorial-small-card"><b>5</b><div><strong>INVOCADAGAS</strong><small>Diestra: +2 Poder.</small></div></div>
              <span className="tutorial-eyebrow">¿DÓNDE LA JUGARÍAS PARA TENER 7 PODER?</span>
              <div className="tutorial-position-row">
                {(["siniestra", "trono", "diestra"] as const).map(p => <button className={"tutorial-position" + (position === p ? " chosen" : "") + (p === "diestra" && position === p ? " correct" : "")} type="button" key={p} onClick={() => setPosition(p)}>{p.toUpperCase()}</button>)}
              </div>
              {position && <div role="status" className={"tutorial-feedback" + (position === "diestra" ? " correct" : "")}>{position === "diestra" ? "¡Bien! En Diestra activa +2 Poder: 5 + 2 = 7." : "Acá conserva 5 Poder. Su habilidad pide Diestra. Probá otra posición."}</div>}
              <span className="tutorial-note">Fuera de afinidad, la carta sigue siendo válida.</span>
            </div>
          )}
          {step === 3 && (
            <div className="tutorial-round">
              <div className="tutorial-round-numbers"><span><b>1</b> ABRÍS O RESPONDÉS</span><span><b>2</b> CAMBIA LA INICIATIVA</span><span><b>3</b> DUELO FINAL*</span></div>
              <p>*Se juega obligatoriamente si el marcador está 1–1. Con 2–0 decide quien va perdiendo.</p>
              <div className="tutorial-reminder"><b>Recordá:</b> una carta puede preparar otra. No siempre conviene empezar con la de mayor Poder.</div>
            </div>
          )}
          {step === 4 && (
            <div className="tutorial-quiero">
              <div className="tutorial-score">0 <span>—</span> 2</div>
              <span className="tutorial-eyebrow">PERDISTE LOS DOS PRIMEROS DUELOS</span>
              <div className="tutorial-decision-actions"><button type="button" className="tutorial-secondary" onClick={() => setQuiero("no")}>NO QUIERO</button><button type="button" className="tutorial-primary" onClick={() => setQuiero("quiero")}>QUIERO</button></div>
              {quiero && <div className="tutorial-feedback correct" role="status">{quiero === "quiero" ? "Se juega el tercer duelo. Si ganás, le quitás 1 Vida al rival." : "Se termina la ronda. Conservás tu tercera carta oculta y no se juega."}</div>}
            </div>
          )}
          {step === 5 && (
            <div className="tutorial-archive">
              <div className="tutorial-archive-grid">
                {(["SINIESTRA", "TRONO", "DIESTRA"] as const).map((p,i) => <div key={p} className="tutorial-archive-slot"><span>{p}</span><strong>{archived && i < 2 ? 1 : 0}</strong><small>en Archivo</small></div>)}
              </div>
              {archived ? <div className="tutorial-feedback correct" role="status">Ahora Siniestra y Trono tienen una carta archivada. Esos contadores persisten entre rondas.</div> : <button type="button" className="tutorial-try" onClick={() => setArchived(true)}>SIMULAR FIN DE RONDA</button>}
            </div>
          )}
          {step === 6 && (
            <div className="tutorial-ready">
              <span className="tutorial-ready-icon" aria-hidden="true">✦</span>
              <strong>Tu primera decisión importa.</strong>
              <p>En la partida, tocá una carta para leerla y seleccionarla. Después tocá una posición resaltada o arrastrá la carta directamente allí.</p>
              <div className="tutorial-ready-pills"><span>Sin maná</span><span>Sin posiciones prohibidas por afinidad</span><span>Ayuda siempre disponible</span></div>
            </div>
          )}
        </div>

        <div className="tutorial-bottom">
          <span className="tutorial-step-count">{step + 1} / {screens.length}</span>
          <div className="tutorial-navigation">
            <button type="button" className="tutorial-back" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>ANTERIOR</button>
            {step < screens.length - 1
              ? <button type="button" className="tutorial-next" onClick={() => setStep(s => Math.min(screens.length - 1, s + 1))}>SIGUIENTE <span aria-hidden="true">→</span></button>
              : <button type="button" className="tutorial-next" onClick={inGame ? onClose : onPlay}>{inGame ? "VOLVER AL DUELO" : "EMPEZAR A JUGAR"} <span aria-hidden="true">→</span></button>}
          </div>
        </div>
      </section>
    </div>
  );
}
