import type { Faction } from "./types";

// Static visual assets are intentionally independent from card art and gameplay.
// Vite uses a relative base for the /gameplay-v1/ GitHub Pages deployment.
export const factionArt = {
  red:    {portrait:"red-portrait.webp",banner:"red-banner.webp"},
  blue:   {portrait:"blue-portrait.webp",banner:"blue-banner.webp"},
  white:  {portrait:"white-portrait.webp",banner:"white-banner.webp"},
  saints: {portrait:"saints-portrait.webp",banner:"saints-banner.webp"},
  ivory:  {portrait:"ivory-portrait.webp",banner:"ivory-banner.webp"}
} as const satisfies Record<Faction,{portrait:string;banner:string}>;

export function factionArtUrl(faction:Faction,view:"portrait"|"banner") {
  return `${import.meta.env.BASE_URL}factions/${factionArt[faction][view]}`;
}
