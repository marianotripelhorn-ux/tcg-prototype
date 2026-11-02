import { allCards, cardsByFaction } from "../data";
import { champions } from "./champions";
import type { CardDefinition, Faction } from "../types";

/**
 * EXPERIMENTAL multifaction deck format. These constraints are NOT official
 * rules yet; the validator is configurable to test future variants.
 */
export interface DeckDefinition {
  id:string;
  name:string;
  championId:string;
  cardIds:string[];
}

export interface DeckRules {
  deckSize:number;
  maxCopies:number;
  distinctCards:number;
  maxFactions:number;
  requireChampionFaction:boolean;
  minPrimaryCards:number;
}

export const proposedMultifactionRules:DeckRules = {
  deckSize:24,
  maxCopies:2,
  distinctCards:12,
  maxFactions:2,
  requireChampionFaction:true,
  minPrimaryCards:1
};

export interface DeckValidation {
  valid:boolean;
  errors:string[];
  factions:Faction[];
  cardsByFaction:Partial<Record<Faction,number>>;
}

const cardLookup=new Map(allCards.flatMap(card=>[[card.id,card],[card.studioId,card]] as [string,CardDefinition][]));

export function validateDeck(deck:DeckDefinition,rules:DeckRules=proposedMultifactionRules):DeckValidation {
  const errors:string[]=[];
  const champion=champions[deck.championId];
  if(!champion)errors.push("Champion desconocido.");
  if(deck.cardIds.length!==rules.deckSize)errors.push(`El mazo debe tener ${rules.deckSize} cartas.`);

  const copies=new Map<string,number>();
  const amounts:Partial<Record<Faction,number>>={};
  for(const id of deck.cardIds) {
    const card=cardLookup.get(id);
    if(!card){errors.push(`Carta desconocida: ${id}`);continue;}
    copies.set(card.id,(copies.get(card.id)??0)+1);
    amounts[card.faction]=(amounts[card.faction]??0)+1;
  }
  if(copies.size!==rules.distinctCards)errors.push(`Elegí exactamente ${rules.distinctCards} cartas distintas.`);
  for(const [id,count] of copies) {
    if(count!==rules.maxCopies)errors.push(`La carta ${id} debe tener exactamente ${rules.maxCopies} copias (actualmente ${count}).`);
  }
  const factions=Object.keys(amounts) as Faction[];
  if(factions.length>rules.maxFactions)errors.push(`Se permiten hasta ${rules.maxFactions} facciones.`);
  if(champion && rules.requireChampionFaction && (amounts[champion.faction]??0)<rules.minPrimaryCards){
    errors.push(`El mazo necesita al menos ${rules.minPrimaryCards} cartas de la facción de ${champion.name}.`);
  }
  return {valid:errors.length===0,errors,factions,cardsByFaction:amounts};
}

export function makeMonoDeckDefinition(championId:string):DeckDefinition {
  const champion=champions[championId];
  if(!champion)throw new Error("Champion desconocido: "+championId);
  return {
    id:"mono-"+championId,
    name:"Mazo inicial · "+champion.name,
    championId,
    cardIds:cardsByFaction[champion.faction].flatMap(card=>[card.id,card.id])
  };
}

export function cardsForDeck(definition:DeckDefinition,rules:DeckRules=proposedMultifactionRules):CardDefinition[] {
  const result=validateDeck(definition,rules);
  if(!result.valid)throw new Error("Mazo inválido: "+result.errors.join(" "));
  return definition.cardIds.map(id=>cardLookup.get(id)!);
}
