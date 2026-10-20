import type { Faction } from "./types";

export interface StudioTheme {
  name: string;
  crown: string;
  divider: string;
  rules: string;
  power: string;
  title: string;
  background: string;
}

export const cardStudioLayout = {
  width: 649,
  height: 914,
  art: { x:19, y:21, w:607, h:532 },
  power: { x:50, y:39, w:153, h:138, fontSize:130 },
  crown: { x:520, y:34, w:82, h:106 },
  title: { x:42, y:575, w:568, h:158, fontSize:78, lines:2 },
  divider: { x:41, y:723, w:566, h:12 },
  rules: { x:41, y:752, w:567, h:106, fontSize:28, lines:3 },
  footer: { x:41, y:862, w:568, h:25, fontSize:15 },
  cornerRadius: 30
} as const;

export const studioThemes: Record<Faction, StudioTheme> = {
  red: {
    name:"Majestad Dextral", crown:"#e10505", divider:"#d3b787",
    rules:"#fafafa", power:"#fafafa", title:"#fafafa", background:"red"
  },
  blue: {
    name:"Corte Sinistral", crown:"#8274c5", divider:"#d3b787",
    rules:"#d3b787", power:"#fafafa", title:"#f6f6f8", background:"blue"
  },
  white: {
    name:"Empíreos", crown:"#e7e5dd", divider:"#d3b787",
    rules:"#e1c999", power:"#fafafa", title:"#f6f6f8", background:"empyrean"
  },
  saints: {
    name:"Santos (TEMP)", crown:"#d5b861", divider:"#d3b787",
    rules:"#e8dfca", power:"#fafafa", title:"#f6f6f8", background:"saints"
  }
};
