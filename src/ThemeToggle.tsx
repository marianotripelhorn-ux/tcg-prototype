import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme } from "./theme";

export default function ThemeToggle({compact=false}: {compact?: boolean}) {
  const theme = useSyncExternalStore(subscribeTheme,getTheme,()=> "light" as const);
  const isDark=theme==="dark";
  const nextLabel=isDark ? "Activar modo claro" : "Activar modo oscuro";
  return (
    <button
      type="button"
      className={"theme-toggle"+(compact?" theme-toggle-compact":"")}
      onClick={()=>setTheme(isDark?"light":"dark")}
      aria-label={nextLabel}
      aria-pressed={isDark}
      title={nextLabel}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      {!compact && <span className="theme-toggle-label">{isDark ? "Claro" : "Oscuro"}</span>}
    </button>
  );
}
