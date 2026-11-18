import { championBackgroundUrl } from "./championArtwork";
import type { Faction } from "./types";
import "./faction-card-back.css";

const marks: Record<Faction, string> = {
  red: "✦",
  blue: "✧",
  white: "◇",
  saints: "◈",
  ivory: "☾"
};

export function FactionCardBack({ faction, className = "" }: { faction: Faction; className?: string }) {
  return <span className={`dl-faction-card-back ${className}`} data-faction={faction} aria-hidden="true">
    <img className="dl-back-art" src={championBackgroundUrl(faction)} alt=""/>
    <span className="dl-back-corner dl-back-corner-top">{marks[faction]}</span>
    <span className="dl-back-crest"><span>{marks[faction]}</span></span>
    <span className="dl-back-corner dl-back-corner-bottom">{marks[faction]}</span>
  </span>;
}
