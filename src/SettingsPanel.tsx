import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import type { GamePreferences } from "./preferences";
import "./settings.css";

export default function SettingsPanel({ preferences, onChange, onClose }: {
  preferences: GamePreferences;
  onChange: (next: GamePreferences) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]'
    ) ?? []);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault(); controls[controls.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
      event.preventDefault(); controls[0].focus();
    }
  }

  return createPortal(
    <div className="dl-settings-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialog} className="dl-settings-modal" role="dialog" aria-modal="true"
        aria-labelledby="dl-settings-title" onKeyDown={onKeyDown}>
        <header className="dl-settings-header">
          <div>
            <span className="dl-settings-eyebrow">DAGGERLIGHT 1.0</span>
            <h2 id="dl-settings-title">CONFIGURACIÓN</h2>
          </div>
          <button ref={closeButton} className="dl-settings-close" type="button"
            onClick={onClose} aria-label="Cerrar configuración">×</button>
        </header>
        <div className="dl-settings-content">
          <div className="dl-settings-setting">
            <div><strong>EFECTOS DE SONIDO</strong><p>Sonidos de las cartas, los duelos y los resultados.</p></div>
            <label className="dl-settings-switch">
              <input type="checkbox" checked={preferences.audioEnabled}
                onChange={event => onChange({...preferences,audioEnabled:event.target.checked})}/>
              <span>{preferences.audioEnabled ? "ACTIVADOS" : "DESACTIVADOS"}</span>
            </label>
          </div>
          <div className="dl-settings-setting dl-settings-volume">
            <label htmlFor="dl-settings-volume"><strong>VOLUMEN</strong></label>
            <div className="dl-settings-volume-line">
              <input id="dl-settings-volume" type="range" min={0} max={100} step={5}
                value={preferences.volume} disabled={!preferences.audioEnabled}
                onChange={event=>onChange({...preferences,volume:Number(event.target.value)})}/>
              <output htmlFor="dl-settings-volume">{preferences.volume}%</output>
            </div>
          </div>
          <div className="dl-settings-setting">
            <div><strong>MOVIMIENTO</strong><p>Reducido acorta ceremonias y evita desplazamientos largos.</p></div>
            <select aria-label="Animaciones" value={preferences.motion}
              onChange={event=>onChange({...preferences,motion:event.target.value as GamePreferences["motion"]})}>
              <option value="standard">ESTÁNDAR</option>
              <option value="reduced">REDUCIDO</option>
            </select>
          </div>
          <div className="dl-settings-setting">
            <div><strong>APARIENCIA</strong><p>Elegí entre el aspecto claro y oscuro.</p></div>
            <ThemeToggle/>
          </div>
          <p className="dl-settings-note">La preferencia del sistema para reducir movimiento siempre se respeta.
            Los cambios de animación se aplican a las siguientes secuencias.
            Estas opciones se guardan solamente en este navegador.</p>
        </div>
        <footer className="dl-settings-footer">
          <button type="button" onClick={onClose}>VOLVER AL JUEGO</button>
        </footer>
      </section>
    </div>,document.body
  );
}
