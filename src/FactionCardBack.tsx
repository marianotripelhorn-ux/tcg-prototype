import type { CSSProperties } from "react";
import { championBackgroundUrl } from "./championArtwork";
import type { Faction } from "./types";
import "./faction-card-back.css";

const logo = {
  "--dl-back-logo": `url("${import.meta.env.BASE_URL}branding/logo-simple.png")`
} as CSSProperties;

export function FactionCardBack({ faction, className = "" }: { faction: Faction; className?: string }) {
  return <span className={`dl-faction-card-back ${className}`} data-faction={faction} aria-hidden="true">
    <img className="dl-back-art" src={championBackgroundUrl(faction)} alt=""/>
    <span className="dl-back-logo" style={logo}/>
  </span>;
}
