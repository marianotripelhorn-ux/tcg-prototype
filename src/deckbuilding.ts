import { allCards, cardsByFaction } from "./data";
import type { CardDefinition, Faction } from "./types";

export interface DeckRules {
  size: number;
  copiesPerCard: number;
  maxFactions: number;
  minimumOwnFactionCards: number;
}
export interface DeckDefinition {
  id: string;
  title: string;
  championId: string;
  cardIds: string[];
  mode: "standard" | "mixed-experiment";
}
export const STANDARD_DECK_RULES:DeckRules={
  size:24,copiesPerCard:2,maxFactions:1,minimumOwnFactionCards:24
};
export const EXPERIMENTAL_MIXED_RULES:DeckRules={
  size:24,copiesPerCard:2,maxFactions:2,minimumOwnFactionCards:12
};

export function validateDeck(
  deck:DeckDefinition,championFaction:Faction,rules:DeckRules
):string[] {
  const errors:string[]=[];
  if(deck.cardIds.length!==rules.size)errors.push(`El mazo debe tener ${rules.size} cartas.`);
  const all=new Map(allCards.map(card=>[card.id,card]));
  const counts=new Map<string,number>();
  for(const id of deck.cardIds)counts.set(id,(counts.get(id)??0)+1);
  for(const [id,count] of counts) {
    if(!all.has(id)){errors.push("Carta desconocida: "+id);continue;}
    if(count>rules.copiesPerCard)errors.push(`Demasiadas copias de ${all.get(id)!.name}: ${count}.`);
  }
  const cards=deck.cardIds.map(id=>all.get(id)).filter((c):c is CardDefinition=>!!c);
  if(new Set(cards.map(c=>c.faction)).size>rules.maxFactions)
    errors.push(`Solo se permiten ${rules.maxFactions} facciones.`);
  if(cards.filter(c=>c.faction===championFaction).length<rules.minimumOwnFactionCards)
    errors.push(`Se requieren al menos ${rules.minimumOwnFactionCards} cartas de la facción del Champion.`);
  return errors;
}

function randomSubset<T>(values:T[],number:number,rng:()=>number):T[] {
  const list=[...values];
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list.slice(0,number);
}

// Explicitly experimental recipe, not an official rule for multifaction decks.
// 6 unique cards x2 from the Champion faction; 6 unique x2 from the ally.
// The resulting 24-card list is reproducible within a saved match.
export function makeMixedExperimentalDeck(
  championId:string,primaryFaction:Faction,secondaryFaction:Faction,rng:()=>number=Math.random
):DeckDefinition {
  if(primaryFaction===secondaryFaction)throw Error("La segunda facción debe ser distinta.");
  const primary=randomSubset(cardsByFaction[primaryFaction],6,rng);
  const secondary=randomSubset(cardsByFaction[secondaryFaction],6,rng);
  const deck:DeckDefinition={
    id:`test-${primaryFaction}-${secondaryFaction}`,
    title:`Experimental ${primaryFaction}/${secondaryFaction}`,
    championId,
    cardIds:[...primary,...secondary].flatMap(card=>[card.id,card.id]),
    mode:"mixed-experiment"
  };
  const errors=validateDeck(deck,primaryFaction,EXPERIMENTAL_MIXED_RULES);
  if(errors.length)throw Error(errors.join(" "));
  return deck;
}
