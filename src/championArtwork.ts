import type { Faction } from "./types";

/** Artwork from the supplied Champion Art and background CHAMP packages. */
export const championImageUrl=(id:string,face=false)=>
  `${import.meta.env.BASE_URL}champions/${face?"faces/":""}${id}.webp`;

export const championBackgroundUrl=(faction:Faction)=>
  `${import.meta.env.BASE_URL}champions/backgrounds/${faction}.webp`;

export const championShortName=(name:string)=>name.split(",")[0].trim();
export const championSubtitle=(name:string)=>name.split(",").slice(1).join(",").trim();
