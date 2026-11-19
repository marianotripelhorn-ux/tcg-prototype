import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DEFAULT_PLAYER_NAME } from "./playerProfile";
import type { MatchFeedbackAnswers } from "./matchFeedback";
import "./match-feedback.css";

const maxAnswerLength = 500;
const emptyAnswers: MatchFeedbackAnswers = {
  fun: null, comment: "", liked: "", disliked: "", suggestion: "", unclear: ""
};

const questions = [
  { name: "liked", label: "¿Qué te gustó más?" },
  { name: "disliked", label: "¿Qué te gustó menos?" },
  { name: "suggestion", label: "¿Qué cambiarías o agregarías?" },
  { name: "unclear", label: "¿En qué momento te costó entender qué hacer?" }
] as const;

interface MatchFeedbackProps {
  playerName: string;
  available: boolean;
  onSkip: () => void;
  onSubmit: (answers: MatchFeedbackAnswers) => Promise<void>;
  onDownload?: (answers: MatchFeedbackAnswers) => void;
}

type Delivery = "idle" | "sending" | "sent" | "send-error" | "downloaded" | "download-error";

export function MatchFeedback({ playerName, available, onSkip, onSubmit, onDownload }: MatchFeedbackProps) {
  const [view, setView] = useState<"quick" | "questionnaire">("quick");
  const [answers, setAnswers] = useState<MatchFeedbackAnswers>(emptyAnswers);
  const [delivery, setDelivery] = useState<Delivery>("idle");
  const submitting = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const radioName = useId();

  useEffect(() => { title.current?.focus(); }, [view]);

  const questionnaire = view === "questionnaire";
  const sending = delivery === "sending";
  const sent = delivery === "sent";
  const canAnswer = !sending && !sent;
  const draft = {
    fun: answers.fun,
    comment: answers.comment.trim(),
    liked: answers.liked.trim(),
    disliked: answers.disliked.trim(),
    suggestion: answers.suggestion.trim(),
    unclear: answers.unclear.trim()
  };
  const hasAnswer = draft.fun !== null ||
    [draft.comment, draft.liked, draft.disliked, draft.suggestion, draft.unclear].some(Boolean);
  const name = playerName.trim();
  const heading = questionnaire ? "Cuestionario de la partida" :
    name && name !== DEFAULT_PLAYER_NAME ? `¿Te divertiste en esta partida, ${name}?` : "¿Te divertiste en esta partida?";

  function setAnswer<K extends keyof MatchFeedbackAnswers>(key: K, value: MatchFeedbackAnswers[K]) {
    setAnswers(previous => ({ ...previous, [key]: value }));
  }

  function download() {
    if (!onDownload || !hasAnswer) return;
    try {
      onDownload(draft);
      setDelivery("downloaded");
    } catch {
      setDelivery("download-error");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasAnswer || submitting.current || sent) return;

    if (!available) {
      download();
      return;
    }

    submitting.current = true;
    setDelivery("sending");
    try {
      await onSubmit(draft);
      setDelivery("sent");
    } catch {
      setDelivery("send-error");
    } finally {
      submitting.current = false;
    }
  }

  return <section className="dl-match-feedback" data-feedback-view={view} role="dialog" aria-modal="true" aria-labelledby={titleId}>
    {questionnaire && <button type="button" className="dl-feedback-link dl-feedback-back"
      disabled={!canAnswer} onClick={() => setView("quick")}>← Volver</button>}
    <h2 id={titleId} ref={title} tabIndex={-1}>{heading}</h2>
    {questionnaire && <p className="dl-feedback-note">Todas las respuestas son opcionales.</p>}
    <form onSubmit={submit}>
      <fieldset className="dl-feedback-fun" disabled={!canAnswer}>
        <legend className={questionnaire ? undefined : "dl-feedback-sr-only"}>¿Te divertiste en esta partida?</legend>
        <div className="dl-feedback-options">
          <label><input type="radio" name={radioName} checked={answers.fun === true}
            onChange={() => setAnswer("fun", true)}/> Sí</label>
          <label><input type="radio" name={radioName} checked={answers.fun === false}
            onChange={() => setAnswer("fun", false)}/> No</label>
        </div>
      </fieldset>
      <label className="dl-feedback-field">
        Comentario (opcional)
        <textarea rows={2} maxLength={maxAnswerLength} value={answers.comment} disabled={!canAnswer}
          onChange={event => setAnswer("comment", event.target.value)}/>
      </label>
      {questionnaire && <div className="dl-feedback-questions">
        {questions.map(question => <label key={question.name} className="dl-feedback-field">
          {question.label}
          <textarea rows={2} maxLength={maxAnswerLength} value={answers[question.name]} disabled={!canAnswer}
            onChange={event => setAnswer(question.name, event.target.value)}/>
        </label>)}
      </div>}
      {!questionnaire && <button type="button" className="dl-feedback-link"
        disabled={!canAnswer} onClick={() => setView("questionnaire")}>Responder un cuestionario</button>}
      {available && !sent && <p className="dl-feedback-note">
        Al enviar, compartís tus respuestas, tu nombre de jugador y el resumen de la partida con el equipo de Daggerlight.
      </p>}
      {!available && <p className="dl-feedback-note">
        El envío no está disponible.{onDownload && " Podés descargar tus respuestas."}
      </p>}
      {delivery === "sending" && <p className="dl-feedback-note" role="status">Enviando tus respuestas…</p>}
      {delivery === "sent" && <p className="dl-feedback-note" role="status">Gracias. Tus respuestas se enviaron.</p>}
      {delivery === "send-error" && <p className="dl-feedback-error" role="alert">No se pudo enviar. Tus respuestas siguen acá. Volvé a intentarlo.</p>}
      {delivery === "downloaded" && <p className="dl-feedback-note" role="status">Descarga iniciada.</p>}
      {delivery === "download-error" && <p className="dl-feedback-error" role="alert">No se pudo iniciar la descarga.</p>}
      <div className="dl-feedback-actions">
        {!sent && (available || onDownload) && <button type="submit" className="dl-feedback-submit" disabled={!hasAnswer || sending}>
          {sending ? "Enviando…" : available ? "Enviar respuestas" : "Descargar respuestas"}
        </button>}
        <button type="button" className="dl-feedback-skip" disabled={sending} onClick={onSkip}>{sent ? "Continuar" : "Omitir"}</button>
      </div>
      {available && delivery === "send-error" && onDownload && <button type="button" className="dl-feedback-link"
        onClick={download}>Descargar respuestas</button>}
    </form>
  </section>;
}
