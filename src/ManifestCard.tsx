import { useEffect } from "react";
import type { SpecialKind } from "./engine/types";
import { SPECIAL_NAME, SPECIAL_TEXT } from "./engine/manifestations";

/** Full card faces for summoned Daggerlight manifestations.
 *  Reused in AI play, PvP and the enlarged inspection view.
 *  These are cards, not decorative icons or toggle labels.
 */
export const MANIFEST_SHORT:Record<SpecialKind,string>={
  dagger:"+1 PODER",
  shield:"−2 AL RIVAL",
  relic:"+2 ARCHIVO",
  symmetry:"COPIAR ESPECIAL"
};

function ManifestIllustration({kind}:{kind:SpecialKind}) {
  return <svg className="manifest-symbol" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <circle cx="60" cy="60" r="49" stroke="currentColor" strokeWidth="1.1"/>
    <circle cx="60" cy="60" r="41" stroke="currentColor" strokeWidth=".75" opacity=".6"/>
    {kind==="dagger"&&<>
      <path d="M60 15 L69 57 L60 69 L51 57 Z" fill="currentColor"/>
      <path d="M60 22 V71" stroke="var(--manifest-icon-ink)" strokeWidth="1.5"/>
      <path d="M37 69 H83 L72 74 H48 Z M56 74 H64 V92 H56 Z" fill="currentColor"/>
      <circle cx="60" cy="95" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M32 45 L41 37 M88 45 L79 37" stroke="currentColor" strokeWidth="1.6"/>
    </>}
    {kind==="shield"&&<>
      <path d="M60 19 C74 29 85 30 89 31 V60 C89 77 75 92 60 101 C45 92 31 77 31 60 V31 C35 30 46 29 60 19 Z" fill="currentColor"/>
      <path d="M60 30 V86 M42 44 H78 M42 56 H78" stroke="var(--manifest-icon-ink)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M60 23 C49 30 41 33 36 34 V60 C36 74 47 85 60 95" stroke="var(--manifest-icon-ink)" strokeWidth="1.2" opacity=".65"/>
    </>}
    {kind==="relic"&&<>
      <path d="M60 34 C47 28 35 29 25 35 V83 C38 77 49 79 60 87 C71 79 82 77 95 83 V35 C85 29 73 28 60 34Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M60 36 V87 M31 43 Q43 38 53 44 M31 55 Q43 50 53 56 M67 44 Q78 38 89 43 M67 56 Q78 50 89 55" stroke="currentColor" strokeWidth="2"/>
      <circle cx="60" cy="22" r="5" fill="currentColor"/>
      <path d="M60 5 V14 M44 17 L49 20 M76 17 L71 20" stroke="currentColor" strokeWidth="1.4"/>
    </>}
    {kind==="symmetry"&&<>
      <circle cx="44" cy="60" r="24" fill="currentColor"/>
      <circle cx="76" cy="60" r="24" stroke="currentColor" strokeWidth="4"/>
      <path d="M60 28 V92 M44 28 V92 M76 28 V92" stroke="var(--manifest-icon-ink)" strokeWidth="1" opacity=".55"/>
      <circle cx="44" cy="60" r="7" fill="var(--manifest-icon-ink)"/>
      <circle cx="76" cy="60" r="7" fill="currentColor"/>
    </>}
  </svg>;
}

export function ManifestCard({
  kind,
  size="hand",
  selected=false
}:{
  kind:SpecialKind;
  size?:"hand"|"field"|"modal";
  selected?:boolean;
}) {
  return <article className={["manifest-card",`manifest-card--${kind}`,`manifest-card--${size}`,selected?"is-armed":""].filter(Boolean).join(" ")}>
    <div className="manifest-card-top">
      <span>DAGGERLIGHT</span><span>✦</span>
    </div>
    <div className="manifest-card-image">
      <ManifestIllustration kind={kind}/>
      <span className="manifest-card-effect">{MANIFEST_SHORT[kind]}</span>
    </div>
    <div className="manifest-card-copy">
      <strong>{SPECIAL_NAME[kind]}</strong>
      <i aria-hidden="true"/>
      <p>{SPECIAL_TEXT[kind]}</p>
    </div>
  </article>;
}

export function ManifestCardDialog({
  kind,
  onClose
}:{
  kind:SpecialKind;
  onClose:()=>void;
}) {
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",key);
    return ()=>window.removeEventListener("keydown",key);
  },[onClose]);
  return <div className="manifest-inspect-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="manifest-inspect-dialog" role="dialog" aria-modal="true" aria-label={SPECIAL_NAME[kind]}>
      <button type="button" className="manifest-inspect-close" onClick={onClose} aria-label="Cerrar carta">×</button>
      <ManifestCard kind={kind} size="modal"/>
    </section>
  </div>;
}
